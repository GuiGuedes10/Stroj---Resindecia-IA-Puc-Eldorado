import numpy as np
from fastapi import HTTPException, Request
from services.bert import extract_bert_embeddings_with_chunks
from services.crawler import web_extract_text, search_related
from utils.utils import extract_features_from_text
from utils.utils import is_url

async def newsCheck(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload JSON inválido.")

    _request = body.get("request")
    if not _request or not _request.strip():
        raise HTTPException(status_code=400, detail="O campo 'request' é obrigatório e não pode estar vazio.")

    if (is_url(_request)): text = web_extract_text(_request)

    else: text = _request

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Erro, texto ou URL invalida.")

    tokenizer = request.app.state.bert_tokenizer
    bert_model = request.app.state.bert_model
    svm_model = request.app.state.svm_model
    scaler = request.app.state.scaler

    X_bert = extract_bert_embeddings_with_chunks(
        text_list=[text],
        bert_model=bert_model,
        tokenizer=tokenizer
    )

    raw_features = extract_features_from_text(text)
    extra_features = np.array(raw_features).reshape(1, -1)
    extra_features_scaled = scaler.transform(extra_features)

    X_combined = np.hstack([X_bert, extra_features_scaled])

    prediction = svm_model.predict(X_combined)[0]

    probabilities = None
    if hasattr(svm_model, "predict_proba"):
        probs = svm_model.predict_proba(X_combined)[0]
        probabilities = [float(p) for p in probs]

    prediction_value = int(prediction) if hasattr(prediction, "item") else prediction

    related = search_related(text)

    return {
        "text": text,
        "prediction": prediction_value,
        "probabilities": probabilities,
        "related": related 
    }