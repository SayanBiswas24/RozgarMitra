from fastapi.testclient import TestClient
from app.main import app

def test_favicon_returns_200():
    client = TestClient(app)
    response = client.get("/favicon.ico")
    assert response.status_code == 200
    assert response.headers["content-type"] in ["image/x-icon", "image/vnd.microsoft.icon"]
