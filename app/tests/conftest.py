import sys
from pathlib import Path

# Os módulos do backend se importam a partir de app/ (from routes import ...),
# então app/ entra no path para os testes rodarem de qualquer diretório.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
