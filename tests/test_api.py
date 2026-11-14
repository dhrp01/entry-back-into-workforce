from fastapi.testclient import TestClient

from app.main import Assessment, app


def test_conversation_and_assessment(monkeypatch):
    captured = []

    def fake_generate(answers):
        captured.extend(answers)
        return Assessment(summary="Summary", skills=[], transferable_skills=[], learning_recommendations=[])

    monkeypatch.setattr("app.main.generate_assessment", fake_generate)
    with TestClient(app) as client:
        response = client.post("/sessions", json={"skills": [
            {"name": "Communication", "questions": ["How do you communicate?", "Give an example."]}
        ]})
        assert response.status_code == 201
        session = response.json()
        sid = session["session_id"]
        assert session["current_question"]["question"] == "How do you communicate?"
        assert client.post(f"/sessions/{sid}/assessment").status_code == 409
        response = client.post(f"/sessions/{sid}/answers", json={"answer": "By listening"})
        assert response.json()["current_question"]["question"] == "Give an example."
        response = client.post(f"/sessions/{sid}/answers", json={"answer": "Team meetings"})
        assert response.json()["status"] == "ready_for_assessment"
        assert client.post(f"/sessions/{sid}/answers", json={"answer": "extra"}).status_code == 409
        assert client.post(f"/sessions/{sid}/assessment").json()["summary"] == "Summary"
        assert len(captured) == 2
        assert client.get(f"/sessions/{sid}").json()["answers"][0]["answer"] == "By listening"


def test_validation_and_missing_session():
    with TestClient(app) as client:
        assert client.get("/sessions/missing").status_code == 404
        assert client.post("/sessions", json={"skills": []}).status_code == 422
        assert client.post("/sessions", json={"skills": [{"name": " ", "questions": ["Q?"]}]}).status_code == 422
