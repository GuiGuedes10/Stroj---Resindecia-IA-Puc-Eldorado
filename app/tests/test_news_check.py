"""
Contrato de POST /news/check com o front (web/src/api/contract.ts).

O BERT, o download da página e a busca são substituídos por versões falsas:
os testes rodam sem rede e sem baixar o modelo. O TestClient é usado fora de
um `with`, então o lifespan (que carrega o BERT) não roda.
"""

from pathlib import Path

import joblib
import numpy as np
import pytest
from fastapi.testclient import TestClient

import main
from controllers import newsCheckController as controller
from services import crawler
from utils.utils import normalize_url

APP_DIR = Path(__file__).resolve().parents[1]
FRONT_ORIGIN = "http://localhost:5173"
PAGE_TEXT = "Texto extraído da página da notícia. " * 10
RELATED = [{"title": "Outra cobertura", "url": "https://www.estadao.com.br/a", "snippet": "Resumo."}]


class FakeClassifier:
    classes_ = np.array([0, 1])

    def __init__(self, p_true=0.2, n_features=772):
        self.p_true = p_true
        self.n_features_in_ = n_features
        self.seen = None

    def predict_proba(self, X):
        self.seen = X
        return np.array([[1 - self.p_true, self.p_true]])


class FakeScaler:
    def transform(self, X):
        return X * 10


@pytest.fixture
def calls(monkeypatch):
    calls = {"fetched": [], "searched": []}

    def fake_embeddings(text_list, bert_model, tokenizer):
        return np.ones((len(text_list), 768))

    def fake_fetch(url):
        calls["fetched"].append(url)
        return PAGE_TEXT

    def fake_search(text):
        calls["searched"].append(text)
        return RELATED

    monkeypatch.setattr(controller, "extract_bert_embeddings_with_chunks", fake_embeddings)
    monkeypatch.setattr(controller, "web_extract_text", fake_fetch)
    monkeypatch.setattr(controller, "search_related", fake_search)
    return calls


@pytest.fixture
def client(calls):
    state = main.app.state
    state.bert_tokenizer = None
    state.bert_model = None
    state.classifier = FakeClassifier()
    state.scaler = None
    state.limiter.enabled = False
    yield TestClient(main.app)
    state.limiter.enabled = True
    state.limiter.reset()


def post(client, body, **kwargs):
    return client.post("/news/check", json=body, headers={"Origin": FRONT_ORIGIN}, **kwargs)


# ─── Resposta ────────────────────────────────────────────────────────────────

def test_texto_colado(client, calls):
    response = post(client, {"request": "  Governo anuncia pacote de mudanças no imposto de renda  "})

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "text": "Governo anuncia pacote de mudanças no imposto de renda",
        "url": None,
        "prediction": 0,
        "probabilities": {"fake": pytest.approx(0.8), "true": pytest.approx(0.2)},
        "related": RELATED,
    }
    assert calls["fetched"] == []


def test_link_com_esquema(client, calls):
    url = "https://g1.globo.com/sp/sao-paulo/noticia.ghtml"
    body = post(client, {"request": url}).json()

    assert calls["fetched"] == [url]
    assert body["url"] == url
    assert body["text"] == PAGE_TEXT
    # A busca de relacionados usa o texto da página, não o endereço.
    assert calls["searched"] == [PAGE_TEXT]


def test_link_sem_esquema_ganha_https(client, calls):
    body = post(client, {"request": "g1.globo.com/sp/noticia.ghtml"}).json()

    assert calls["fetched"] == ["https://g1.globo.com/sp/noticia.ghtml"]
    assert body["url"] == "https://g1.globo.com/sp/noticia.ghtml"


def test_prediction_segue_as_probabilidades(client):
    main.app.state.classifier = FakeClassifier(p_true=0.9)
    body = post(client, {"request": "Texto qualquer de notícia para classificar."}).json()

    assert body["prediction"] == 1
    assert body["probabilities"]["true"] == pytest.approx(0.9)


# ─── Erros no formato {"error": {"code", "message"}} ────────────────────────

def assert_error(response, status, code):
    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert response.json()["error"]["message"]
    # Sem o cabeçalho de CORS o navegador esconde o corpo e o front só vê
    # "falha de rede".
    assert response.headers.get("access-control-allow-origin") == FRONT_ORIGIN


def test_pagina_sem_texto(client, monkeypatch):
    monkeypatch.setattr(controller, "web_extract_text", lambda url: "")
    assert_error(post(client, {"request": "https://exemplo.com.br/paywall"}), 502, "page_unreachable")


@pytest.mark.parametrize("body", [{}, {"request": ""}, {"request": "   "}, {"request": 123}, {"text": "texto"}, []])
def test_texto_ausente_ou_vazio(client, body):
    assert_error(post(client, body), 400, "text_too_short")


def test_json_invalido(client):
    response = client.post(
        "/news/check",
        content="não é json",
        headers={"Origin": FRONT_ORIGIN, "Content-Type": "application/json"},
    )
    assert_error(response, 400, "invalid_request")


def test_texto_longo_demais(client):
    assert_error(post(client, {"request": "a " * 10_001}), 413, "text_too_long")


def test_falha_na_classificacao(client):
    class Broken(FakeClassifier):
        def predict_proba(self, X):
            raise RuntimeError("modelo quebrado")

    main.app.state.classifier = Broken()
    assert_error(post(client, {"request": "Texto qualquer de notícia para classificar."}), 500, "classification_failed")


def test_limite_de_consultas(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT", "2/minute")
    main.app.state.limiter.enabled = True
    main.app.state.limiter.reset()

    body = {"request": "Texto qualquer de notícia para classificar."}
    assert post(client, body).status_code == 200
    assert post(client, body).status_code == 200
    assert_error(post(client, body), 429, "rate_limited")


# ─── CORS ────────────────────────────────────────────────────────────────────

def test_preflight_do_front(client):
    response = client.options(
        "/news/check",
        headers={
            "Origin": FRONT_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONT_ORIGIN


def test_origem_desconhecida_nao_ganha_cors(client):
    response = client.post("/news/check", json={"request": "x"}, headers={"Origin": "https://outro-site.com"})
    assert "access-control-allow-origin" not in response.headers


# ─── Features ────────────────────────────────────────────────────────────────

def state_with(classifier, scaler=None):
    class State:
        pass

    state = State()
    state.bert_model = None
    state.bert_tokenizer = None
    state.classifier = classifier
    state.scaler = scaler
    return state


def test_modelo_so_com_bert_recebe_768_features(calls):
    X = controller.build_features(state_with(FakeClassifier(n_features=768)), "TEXTO!!")
    assert X.shape == (1, 768)


def test_modelo_com_features_de_texto_recebe_772(calls):
    X = controller.build_features(state_with(FakeClassifier()), "TEXTO!!")
    assert X.shape == (1, 772)
    assert X[0, 768:].tolist() == [1, 1, 0, 0]


def test_scaler_aplica_nas_features_de_texto(calls):
    X = controller.build_features(state_with(FakeClassifier(), FakeScaler()), "TEXTO!!")
    assert X[0, 768:].tolist() == [10, 10, 0, 0]
    assert X[0, :768].tolist() == [1] * 768


def test_modelo_sem_predict_proba_usa_sigmoide(calls):
    class Margin:
        classes_ = np.array([0, 1])
        n_features_in_ = 768

        def decision_function(self, X):
            return np.array([0.0])

    probabilities = controller.classify(state_with(Margin()), "texto")
    assert probabilities == {"fake": pytest.approx(0.5), "true": pytest.approx(0.5)}


@pytest.mark.parametrize(
    "model_path, scaler_path",
    [
        # O padrão de main.py: a Regressão Logística com o scaler.
        (main.DEFAULT_CLASSIFICATION_MODEL, main.DEFAULT_SCALER_MODEL),
        ("model/svm_(rbf)_model.pkl", "model/scaler.pkl"),
        ("../model/supervised/results/xgboost_model.pkl", "model/scaler.pkl"),
    ],
)
def test_modelos_do_repositorio(calls, model_path, scaler_path):
    classifier = joblib.load(APP_DIR / model_path)
    scaler = joblib.load(APP_DIR / scaler_path) if scaler_path else None

    probabilities = controller.classify(state_with(classifier, scaler), "URGENTE!!! Compartilhe antes que apaguem!!")

    assert set(probabilities) == {"fake", "true"}
    assert probabilities["fake"] + probabilities["true"] == pytest.approx(1)


# ─── Busca de relacionados ──────────────────────────────────────────────────

def test_busca_que_falha_nao_derruba_a_consulta(monkeypatch):
    class Boom:
        def __enter__(self):
            raise RuntimeError("buscador fora do ar")

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(crawler, "DDGS", Boom)
    assert crawler.search_related("texto da notícia") == []


def test_download_que_falha_vira_texto_vazio(monkeypatch):
    def boom(url):
        raise RuntimeError("sem rede")

    monkeypatch.setattr(crawler.trafilatura, "fetch_url", boom)
    assert crawler.web_extract_text("https://exemplo.com.br") == ""


# ─── Link ou texto: a mesma regra do front (web/src/domain/input.test.ts) ────

FRAME_URL = "https://g1.globo.com/sp/sao-paulo/noticia/2026/03/10/acidente-marginal-tiete.ghtml"
FRAME_TEXT = (
    "Esse pacote de impostos é o maior absurdo que eu já vi nesse país. Quem ganha mais de 5 mil "
    "vai pagar o dobro a partir do mês que vem e ninguém está falando disso."
)


@pytest.mark.parametrize(
    "value, expected",
    [
        (FRAME_URL, FRAME_URL),
        (f"  {FRAME_URL}  ", FRAME_URL),
        ("g1.globo.com/sp/sao-paulo/noticia.ghtml", "https://g1.globo.com/sp/sao-paulo/noticia.ghtml"),
        ("http://exemplo.com.br", "http://exemplo.com.br"),
        (FRAME_TEXT, None),
        ("", None),
        ("Acidente na Marginal Tietê deixa 12 feridos.", None),
        ("absurdo", None),
        ("https://localhost", None),
        ("palavra...palavra", None),
    ],
)
def test_normalize_url(value, expected):
    assert normalize_url(value) == expected
