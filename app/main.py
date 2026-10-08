import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import joblib
from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModel
from slowapi.errors import RateLimitExceeded
from routes import newsCheckRoute
from utils.errors import ApiError, api_error_handler, rate_limit_handler

BASE_DIR = Path(__file__).resolve().parent

# O .env fica em app/, ao lado deste arquivo, de onde quer que o servidor seja iniciado.
load_dotenv(BASE_DIR / ".env")

DEFAULT_MODEL_NAME = "neuralmind/bert-base-portuguese-cased"
# Modelo final da documentação (seção 7.5): a Regressão Logística.
DEFAULT_CLASSIFICATION_MODEL = "../model/supervised/results/logistic_regression_model.pkl"
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def resolve_path(value: str) -> Path:
    # Caminhos relativos no .env são relativos a app/, não ao diretório atual.
    path = Path(value)
    return path if path.is_absolute() else BASE_DIR / path


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_name = os.getenv("MODEL_NAME") or DEFAULT_MODEL_NAME
    app.state.bert_tokenizer = AutoTokenizer.from_pretrained(model_name)
    app.state.bert_model = AutoModel.from_pretrained(model_name)
    app.state.classifier = joblib.load(
        resolve_path(os.getenv("CLASSIFICATION_MODEL") or DEFAULT_CLASSIFICATION_MODEL)
    )
    yield

app = FastAPI(lifespan=lifespan)

# O front roda em outra origem (Vite em :5173), então o navegador exige CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.state.limiter = newsCheckRoute.limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_exception_handler(ApiError, api_error_handler)

@app.get("/")
def read_root():
    return {"Hello": "World"}

app.include_router(newsCheckRoute.router, prefix="/news")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
