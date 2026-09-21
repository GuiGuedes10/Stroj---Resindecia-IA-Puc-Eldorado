from fastapi import FastAPI
import uvicorn
import joblib
from routes import newsCheckRoute
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app = FastAPI()

app.state.limiter = newsCheckRoute.limiter 
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

#classificador = joblib.load("classificador.pkl")

@app.get("/")
def read_root():
    return {"Hello": "World"}

app.include_router(newsCheckRoute.router, prefix="/news")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)