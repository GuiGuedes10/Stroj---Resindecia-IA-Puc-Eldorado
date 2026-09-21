from fastapi import HTTPException, Request

async def newsCheck(request: Request):
    return "Hello world!"