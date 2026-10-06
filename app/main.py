import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
import joblib
from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModel
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from routes import newsCheckRoute

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.bert_tokenizer = AutoTokenizer.from_pretrained(os.getenv("MODEL_NAME"))
    app.state.bert_model = AutoModel.from_pretrained(os.getenv("MODEL_NAME"))
    app.state.classification_model = joblib.load(os.getenv("CLASSIFICATION_MODEL"))
    yield

app = FastAPI(lifespan=lifespan)

app.state.limiter = newsCheckRoute.limiter 
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/")
def read_root():
    return {"Hello": "World"}

app.include_router(newsCheckRoute.router, prefix="/news")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
