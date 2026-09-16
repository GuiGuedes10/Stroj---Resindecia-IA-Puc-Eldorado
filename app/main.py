from fastapi import FastAPI
from bert import extract_bert_embeddings_with_chunks
from utils import extract_features_from_text
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
    
    # Extract BERT embeddings
    X = extract_bert_embeddings_with_chunks(text)
    print(f"Extracted embeddings shape: {X.shape}")
    
    # Extract features from the text
    features = extract_features_from_text(text)
    print(f"Extracted features: {features}")
    
    # Combine embeddings and features
    
    
    # Make prediction using the classifier
    #prediction = classificador.predict(X)[0]
    #print(f"Prediction result: {prediction}")

    return {
        #"prediction": int(prediction)
        "prediction": 0.5
    }