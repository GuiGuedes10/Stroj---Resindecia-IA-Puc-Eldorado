import logging
import trafilatura
from ddgs import DDGS

logger = logging.getLogger(__name__)


def web_extract_text(url: str) -> str:
    try:
        downloaded = trafilatura.fetch_url(url)
    except Exception:
        logger.warning("Falha ao baixar %s", url, exc_info=True)
        return ""

    if not downloaded:
        return ""

    texto = trafilatura.extract(downloaded)

    return texto if texto else ""


def search_related(texto: str, max_results: int = 5):
    if not texto:
        return []

    query = texto[:500]

    # A busca é um extra: se o buscador falhar ou limitar as consultas,
    # a classificação ainda vale e o front mostra "nenhum conteúdo relacionado".
    try:
        with DDGS() as ddgs:
            resultados = ddgs.text(
                query,
                max_results=max_results
            )
    except Exception:
        logger.warning("Falha na busca de conteúdos relacionados", exc_info=True)
        return []

    return [
        {
            "title": resultado.get("title"),
            "url": resultado.get("href"),
            "snippet": resultado.get("body")
        }
        for resultado in resultados or []
    ]
