import trafilatura
from ddgs import DDGS


def web_extract_text(url: str) -> str:
    downloaded = trafilatura.fetch_url(url)

    if not downloaded:
        return ""

    texto = trafilatura.extract(downloaded)

    return texto if texto else ""


def search_related(texto: str, max_results: int = 5):
    if not texto:
        return []

    query = texto[:500]

    with DDGS() as ddgs:
        resultados = ddgs.text(
            query,
            max_results=max_results
        )

    return [
        {
            "title": resultado.get("title"),
            "url": resultado.get("href"),
            "snippet": resultado.get("body")
        }
        for resultado in resultados
    ]