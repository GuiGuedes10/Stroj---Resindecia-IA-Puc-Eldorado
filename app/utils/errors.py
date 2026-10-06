from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded


# Erros no formato que o front lê (web/src/api/contract.ts, mapErrorCode):
#   {"error": {"code": "...", "message": "..."}}
# Códigos que o front conhece: page_unreachable, text_too_short,
# text_too_long, rate_limited. Qualquer outro vira classification_failed.
class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return error_response(
        429,
        "rate_limited",
        f"Limite de consultas atingido ({exc.detail}). Aguarde e tente de novo.",
    )
