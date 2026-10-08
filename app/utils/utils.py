import re
from urllib.parse import urlparse

BARE_HOST = re.compile(
    r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$",
    re.IGNORECASE,
)


# A mesma regra do front (web/src/domain/input.ts, isLink): aceita
# "https://g1.globo.com/..." e também "g1.globo.com/..." sem esquema.
# Devolve a URL com esquema, ou None quando a entrada é texto.
def normalize_url(text: str):
    value = text.strip()
    if not value or re.search(r"\s", value):
        return None
    # "//g1.globo.com/..." é link para o front (WHATWG URL); aqui também.
    if value.startswith("//"):
        value = "https:" + value

    has_scheme = re.match(r"^https?://", value, re.IGNORECASE) is not None
    url = value if has_scheme else f"https://{value}"

    try:
        parsed = urlparse(url)
        host = parsed.hostname
        parsed.port  # porta inválida (":abc", ":99999") levanta ValueError
    except ValueError:
        return None
    if not host or "." not in host:
        return None

    if not has_scheme:
        # Sem esquema, exige um host plausível: evita tratar
        # "palavra...palavra" como endereço.
        try:
            ascii_host = host.encode("idna").decode("ascii")
        except UnicodeError:
            return None
        if not BARE_HOST.match(ascii_host):
            return None

    return url


def is_url(text: str) -> bool:
    return normalize_url(text) is not None