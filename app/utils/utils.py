from urllib.parse import urlparse

def is_url(text: str) -> bool:
    try:
        result = urlparse(text.strip())
        return all([result.scheme in ["http", "https"], result.netloc])
    except Exception:
        return False