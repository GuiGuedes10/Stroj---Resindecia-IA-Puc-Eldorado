import logging
import numpy as np
from fastapi import Request
from fastapi.concurrency import run_in_threadpool
from services.bert import extract_bert_embeddings_with_chunks
from services.crawler import web_extract_text, search_related
from utils.errors import ApiError
from utils.utils import extract_features_from_text, normalize_url

logger = logging.getLogger(__name__)

# O mesmo limite do front (web/src/domain/input.ts, MAX_TEXT_LENGTH).
MAX_TEXT_LENGTH = 20_000

# Rótulos do dataset (training_data/dataset.ipynb): 0 = falsa, 1 = verdadeira.
LABEL_FAKE = 0
LABEL_TRUE = 1


async def newsCheck(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise ApiError(400, "invalid_request", "Payload JSON inválido.")

    # Link e texto chegam no mesmo campo; o backend decide qual é.
    _request = body.get("text") if isinstance(body, dict) else None
    if not isinstance(_request, str) or not _request.strip():
        raise ApiError(400, "text_too_short", "O campo 'text' é obrigatório e não pode estar vazio.")

    _request = _request.strip()
    if len(_request) > MAX_TEXT_LENGTH:
        raise ApiError(413, "text_too_long", f"O texto passa do limite de {MAX_TEXT_LENGTH} caracteres.")

    # BERT, download da página e busca são bloqueantes: rodam fora do event
    # loop para não travar as outras requisições.
    return await run_in_threadpool(analyze, request.app.state, _request)


def analyze(state, entrada: str):
    url = normalize_url(entrada)

    if url:
        text = web_extract_text(url)
        if not text or not text.strip():
            raise ApiError(502, "page_unreachable", "Não foi possível extrair o texto dessa página.")
    else:
        text = entrada

    try:
        probabilities = classify(state, text)
    except Exception:
        logger.exception("Falha ao classificar o texto")
        raise ApiError(500, "classification_failed", "Não foi possível classificar o texto.")

    related = search_related(text)

    return {
        "text": text,
        "url": url,
        # A classe sai das probabilidades para as duas nunca se contradizerem
        # (no SVC, predict e predict_proba podem discordar perto da fronteira).
        "prediction": LABEL_FAKE if probabilities["fake"] > probabilities["true"] else LABEL_TRUE,
        "probabilities": probabilities,
        "related": related
    }


def classify(state, text: str):
    classifier = state.classifier
    X = build_features(state, text)

    if hasattr(classifier, "predict_proba"):
        probs = classifier.predict_proba(X)[0]
        by_label = {int(label): float(p) for label, p in zip(classifier.classes_, probs)}
        return {"fake": by_label[LABEL_FAKE], "true": by_label[LABEL_TRUE]}

    # Modelos sem predict_proba (SVC sem probability=True, por exemplo):
    # a margem de decisão vira probabilidade pela sigmoide.
    score = float(classifier.decision_function(X)[0])
    p_true = float(1 / (1 + np.exp(-score)))
    return {"fake": 1 - p_true, "true": p_true}


def build_features(state, text: str):
    X_bert = extract_bert_embeddings_with_chunks(
        text_list=[text],
        bert_model=state.bert_model,
        tokenizer=state.bert_tokenizer
    )

    # 768 = só o BERT. 772 = BERT + as 4 features de texto (utils/utils.py).
    n_expected = getattr(state.classifier, "n_features_in_", X_bert.shape[1])
    if n_expected == X_bert.shape[1]:
        return X_bert

    raw_features = extract_features_from_text(text)
    extra_features = np.array(raw_features, dtype=float).reshape(1, -1)
    if state.scaler is not None:
        extra_features = state.scaler.transform(extra_features)

    return np.hstack([X_bert, extra_features])
