import os
from fastapi.testclient import TestClient
import pytest

# We will import the app from main
from main import app

def test_tts_endpoint():
    # Verify endpoint returns audio/wav stream by running within the client's lifespan context manager
    with TestClient(app) as client:
        response = client.post("/api/tts", json={"text": "Hello world", "voice": "af_bella"})
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/wav"
        assert len(response.content) > 0
