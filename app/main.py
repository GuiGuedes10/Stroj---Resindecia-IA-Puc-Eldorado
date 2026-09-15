from fastapi import FastAPI
from bert import extract_bert_embeddings_with_chunks
import joblib

app = FastAPI()

#classificador = joblib.load("classificador.pkl")

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/api/predict")
def predict(data: dict):
    text = data["text"]
    print(f"Received text for prediction: {text}")
    
    X = extract_bert_embeddings_with_chunks(text)
    print(f"Extracted embeddings shape: {X.shape}")
    
    #prediction = classificador.predict(X)[0]
    #print(f"Prediction result: {prediction}")

    return {
        #"prediction": int(prediction)
        "prediction": 0.5
    }