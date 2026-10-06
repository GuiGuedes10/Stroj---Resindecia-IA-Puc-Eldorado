import re
from urllib.parse import urlparse

# 1. Caixa alta é predominante
# Considera apenas letras e verifica se mais de 50% estão em maiúsculas
def caixa_alta_predominante(text):
    letras = [c for c in text if c.isalpha()]
    
    if not letras:
        return 0
    
    maiusculas = sum(c.isupper() for c in letras)
    return int(maiusculas / len(letras) > 0.5)


# 2. Mais de um ponto de exclamação seguido
def multiplas_exclamacoes(text):
    return int(bool(re.search(r"!{2,}", text)))


# 3. Mais de um ponto de interrogação seguido
def multiplas_interrogacoes(text):
    return int(bool(re.search(r"\?{2,}", text)))


# 4. Caracteres especiais
def possui_caracteres_especiais(text):
    return int(bool(re.search(r"[#@$%*_+=<>|~^]", text)))


def extract_features_from_text(textos):
    return (
        caixa_alta_predominante(textos),
        multiplas_exclamacoes(textos),
        multiplas_interrogacoes(textos),
        possui_caracteres_especiais(textos)
    )

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