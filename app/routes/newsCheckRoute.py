import logging
import os
from fastapi import APIRouter, Request
from controllers.newsCheckController import newsCheck
from limits import parse_many
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

DEFAULT_RATE_LIMIT = "5/minute"

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)


# Lido a cada requisição: o .env só é carregado depois que este módulo é importado.
# Um valor inválido desligaria o limite sem aviso; volta ao padrão.
def rate_limit() -> str:
    value = os.getenv("RATE_LIMIT") or DEFAULT_RATE_LIMIT
    try:
        parse_many(value)
    except ValueError:
        logger.error("RATE_LIMIT inválido: %r; usando %s", value, DEFAULT_RATE_LIMIT)
        return DEFAULT_RATE_LIMIT
    return value


@router.post("/check")
@limiter.limit(rate_limit)
async def prompt(request: Request):
    return await newsCheck(request)
