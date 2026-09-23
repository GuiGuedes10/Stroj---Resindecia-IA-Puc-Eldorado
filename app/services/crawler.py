import trafilatura

def web_extract_text(url: str) -> str:
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        return ""
    
    texto = trafilatura.extract(downloaded)
    return texto if texto else ""