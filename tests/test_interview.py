import json
from fastapi.testclient import TestClient

from app.main import app
from datetime import date

from app.interview import (QUESTION_REFERENCES, ROADMAP_REFERENCES, SKILLS, InterviewRequest,
                           Question, Roadmap, generate, onboarding_context)


def test_interview_passes_profile_and_history(monkeypatch):
    seen = []

    def fake_generate(request, schema, task, references=()):
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
    monkeypatch.setattr('rtw.skills.SKILL_FILE', skills)
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


def fake_gemini(monkeypatch, prompts, text):
    monkeypatch.setenv('GEMINI_API_KEY', 'test')

    class Models:
        def generate_content(self, **kwargs):
            prompts.append(kwargs['contents'])
            return type('Response', (), {'text': text})()

    monkeypatch.setattr('app.interview.genai.Client', lambda **kwargs: type('Client', (), {'models': Models()})())


def test_every_listed_reference_exists():
    for name in set(QUESTION_REFERENCES) | set(ROADMAP_REFERENCES):
        assert (SKILLS.parent / 'references' / name).exists(), name


def test_question_and_roadmap_get_their_own_references(monkeypatch):
    prompts = []
    fake_gemini(monkeypatch, prompts, '{"question": "Q?", "summary": "S", "strengths": [], "growth_areas": [], "unknowns": [], "steps": []}')
    with TestClient(app) as client:
        client.post('/interview/question', json={})
        client.post('/interview/roadmap', json={})
    assert '--- references/intake.md ---' in prompts[0]
    assert '--- references/pathways.md ---' not in prompts[0]
    assert '--- references/pathways.md ---' in prompts[1]


def test_question_returns_options_selection_and_done(monkeypatch):
    fake_gemini(monkeypatch, [], '{"intro": "Nice.", "question": "Which have you done?", '
                '"options": ["Managed the family budget", "Planned a big event"], "selection": "multiple", "done": false}')
    with TestClient(app) as client:
        body = client.post('/interview/question', json={}).json()
    assert body['options'] == ['Managed the family budget', 'Planned a big event']
    assert body['selection'] == 'multiple'
    assert body['intro'] == 'Nice.'
    assert body['done'] is False


def test_onboarding_answers_are_mapped_and_not_re_asked():
    text = onboarding_context({
        'name': 'Melissa', 'lastRole': 'Childcare worker', 'field': 'unknown-field', 'education': 'Associate in ECE',
        'awayDate': '2021-11', 'startDate': '2027-03', 'strengths': 'patience', 'improvement': 'Excel',
    }, today=date(2026, 11, 14))
    assert 'Never ask them again' in text
    assert 'Most recent role: Childcare worker' in text
    assert 'Stepped away: November 2021 (about 5 years; 3–5 years). Covers Q4 fully' in text
    assert 'Target return: March 2027 (3–6 months)' in text
    assert 'Education: Associate in ECE' in text
    assert 'self-assessments, not evidence' in text
    assert 'Not answered in onboarding' not in text


def test_empty_onboarding_answers_are_treated_as_unanswered():
    text = onboarding_context({'name': '', 'awayDate': ''}, today=date(2026, 11, 14))
    assert 'time away (Q4)' in text
    assert 'most recent role (Q1)' in text
    assert 'Name:' not in text


def test_interview_allows_a_long_intake():
    turns = [{'question': f'Q{i}', 'answer': 'A'} for i in range(45)]
    assert len(InterviewRequest(turns=turns).turns) == 45


def test_demo_mode_replays_the_recording_without_gemini(monkeypatch, tmp_path):
    recording = tmp_path / 'recording.json'
    recording.write_text(json.dumps({
        'profile': {'name': 'Melissa'},
        'steps': [
            {'response': {'intro': 'Hi.', 'question': 'How long?', 'options': ['3–5 years'], 'selection': 'single', 'done': False}, 'answer': '3–5 years', 'highlight': False},
            {'response': {'intro': '', 'question': 'Ready?', 'options': [], 'selection': 'single', 'done': True}, 'answer': None},
        ],
        'roadmap': {'summary': 'Recorded plan', 'strengths': [], 'pathways': [], 'growth_areas': [], 'unknowns': [], 'steps': []},
    }), encoding='utf-8')
    monkeypatch.setattr('app.interview.RECORDING', recording)
    monkeypatch.setenv('INTERVIEW_DEMO', '1')
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    turn = {'question': 'How long?', 'answer': '3–5 years'}
    with TestClient(app) as client:
        assert client.post('/interview/demo', json={}).json() == {'profile': {'name': 'Melissa'}}
        first = client.post('/interview/question', json={}).json()
        assert first['question'] == 'How long?' and first['demo_answer'] == '3–5 years' and first['demo_skip'] is True
        last = client.post('/interview/question', json={'turns': [turn]}).json()
        assert last['done'] is True and last['demo_skip'] is False
        assert client.post('/interview/question', json={'turns': [turn, turn]}).status_code == 409
        assert client.post('/interview/roadmap', json={}).json()['summary'] == 'Recorded plan'


def test_demo_endpoint_is_off_by_default(monkeypatch):
    monkeypatch.delenv('INTERVIEW_DEMO', raising=False)
    with TestClient(app) as client:
        assert client.post('/interview/demo', json={}).status_code == 404
