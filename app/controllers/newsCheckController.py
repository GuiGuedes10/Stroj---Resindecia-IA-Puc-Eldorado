from fastapi import HTTPException, Request
from services.bert import extract_bert_embeddings_with_chunks 

async def newsCheck(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload JSON inválido.")

    text = body.get("text")
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="O campo 'text' é obrigatório e não pode estar vazio.")

    tokenizer = request.app.state.bert_tokenizer
    bert_model = request.app.state.bert_model
    svm_model = request.app.state.svm_model

    embeddings = extract_bert_embeddings_with_chunks(
        text_list=[text],
        bert_model=bert_model,
        tokenizer=tokenizer
    )

    prediction = svm_model.predict(embeddings)[0]

    probabilities = None
    if hasattr(svm_model, "predict_proba"):
        probs = svm_model.predict_proba(embeddings)[0]
        probabilities = [float(p) for p in probs]

    prediction_value = int(prediction) if hasattr(prediction, "item") else prediction

    return {
        "text": text,
        "prediction": prediction_value,
        "probabilities": probabilities
    }