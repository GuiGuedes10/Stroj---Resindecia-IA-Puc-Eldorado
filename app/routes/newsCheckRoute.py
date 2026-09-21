from fastapi import APIRouter, Request
from controllers.newsChackController import newsCheck
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

@router.post("/check")
@limiter.limit("5/minute")
async def prompt(request: Request):
    return await newsCheck(request)