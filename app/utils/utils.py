import re

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