from fastapi import APIRouter, Request
from controllers.newsCheckController import newsCheck
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

@router.post("/check")
@limiter.limit("5/minute")
async def prompt(request: Request):
    tokenizer = request.app.state.bert_tokenizer
    bert_model = request.app.state.bert_model
    classification_model = request.app.state.classification_model
    return await newsCheck(request)