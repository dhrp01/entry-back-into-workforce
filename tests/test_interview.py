from fastapi.testclient import TestClient

from app.main import app
from app.interview import InterviewRequest, Question, Roadmap, generate


def test_interview_passes_profile_and_history(monkeypatch):
    seen = []

    def fake_generate(request, schema, task):
        seen.append(request)
        if schema is Question:
            return Question(question='Tell me more about your experience.')
        return Roadmap(summary='Your plan', strengths=[], growth_areas=[], unknowns=['Target role'], steps=[])

    monkeypatch.setattr('app.interview.generate', fake_generate)
    payload = {'profile': {'name': 'Sam', 'education': 'Diploma'}, 'turns': [
        {'question': 'What tools?', 'answer': 'Excel'}]}
    with TestClient(app) as client:
        assert client.post('/interview/question', json=payload).json()['question'].startswith('Tell me')
        assert client.post('/interview/roadmap', json=payload).json()['summary'] == 'Your plan'
    assert seen[0].profile['education'] == 'Diploma'
    assert seen[0].turns[0].answer == 'Excel'


def test_skill_file_is_loaded_for_each_request(monkeypatch, tmp_path):
    skills = tmp_path / 'SKILL.md'
    skills.write_text('# Custom skill\nAsk about negotiation.', encoding='utf-8')
    monkeypatch.setattr('app.interview.SKILLS', skills)
    monkeypatch.setenv('GEMINI_API_KEY', 'test')
    prompts = []

    class Models:
        def generate_content(self, **kwargs):
            prompts.append(kwargs['contents'])
            return type('Response', (), {'text': '{"question": "Tell me more?"}'})()

    monkeypatch.setattr('app.interview.genai.Client', lambda **kwargs: type('Client', (), {'models': Models()})())
    generate(InterviewRequest(), Question, 'Ask a question.')
    assert 'Ask about negotiation.' in prompts[0]
    skills.write_text('Updated skill guidance', encoding='utf-8')
    generate(InterviewRequest(), Question, 'Ask a question.')
    assert 'Updated skill guidance' in prompts[1]


def test_missing_key_and_validation(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    with TestClient(app) as client:
        assert client.post('/interview/question', json={'profile': {}}).status_code == 503
        assert client.post('/interview/question', json={'turns': [{'question': 'Q', 'answer': ''}]}).status_code == 422
