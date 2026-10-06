import numpy as np
from fastapi import HTTPException, Request
from services.bert import extract_bert_embeddings_with_chunks
from services.crawler import web_extract_text, search_related
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
    classification_model = request.app.state.classification_model

    X_bert = extract_bert_embeddings_with_chunks(
        text_list=[text],
        bert_model=bert_model,
        tokenizer=tokenizer
    )
    prediction = classification_model.predict(X_bert)[0]

    probabilities = None
    if hasattr(classification_model, "predict_proba"):
        probs = classification_model.predict_proba(X_bert)[0]
        probabilities = [float(p) for p in probs]

    prediction_value = int(prediction) if hasattr(prediction, "item") else prediction

    related = search_related(text)

    return {
        "text": text,
        "prediction": prediction_value,
        "probabilities": probabilities,
        "related": related 
    }