import ipaddress
import logging
import os
import socket
from urllib.parse import urlparse
import trafilatura
from ddgs import DDGS

logger = logging.getLogger(__name__)


# Só baixa páginas de endereços públicos: sem isso, a API leria para quem
# chama páginas internas (localhost, rede privada, metadados da nuvem).
def is_public_url(url: str) -> bool:
    host = urlparse(url).hostname
    if not host:
        return False
    try:
        enderecos = {info[4][0] for info in socket.getaddrinfo(host, None)}
    except (socket.gaierror, UnicodeError):
        return False
    return all(ipaddress.ip_address(e.split("%")[0]).is_global for e in enderecos)


def web_extract_text(url: str) -> str:
    if not is_public_url(url):
        logger.warning("Endereço não público recusado: %s", url)
        return ""

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
                region=os.getenv("SEARCH_REGION") or "br-pt",
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
