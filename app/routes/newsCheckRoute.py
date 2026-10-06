import os
from fastapi import APIRouter, Request
from controllers.newsCheckController import newsCheck
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)


# Lido a cada requisição: o .env só é carregado depois que este módulo é importado.
def rate_limit() -> str:
    return os.getenv("RATE_LIMIT") or "5/minute"


@router.post("/check")
@limiter.limit(rate_limit)
async def prompt(request: Request):
    return await newsCheck(request)
