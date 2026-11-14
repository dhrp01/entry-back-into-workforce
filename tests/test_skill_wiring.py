import json

from fastapi.testclient import TestClient

from app.main import app
from rtw import coach


def test_fastapi_question_and_roadmap_use_skill_file(monkeypatch, tmp_path):
    skill = tmp_path / 'SKILL.md'
    skill.write_text('Unique skill guidance for verification', encoding='utf-8')
    monkeypatch.setattr('rtw.skills.SKILL_FILE', skill)
    monkeypatch.setenv('GEMINI_API_KEY', 'test')
    prompts = []

    class Models:
        def generate_content(self, **kwargs):
            prompts.append(kwargs['contents'])
            if kwargs['config']['response_schema'].__name__ == 'Question':
                data = {'question': 'Tell me more?'}
            else:
                data = {'summary': 'Plan', 'strengths': [], 'growth_areas': [], 'unknowns': [], 'steps': []}
            return type('Response', (), {'text': json.dumps(data)})()

    monkeypatch.setattr('app.interview.genai.Client', lambda **kwargs: type('Client', (), {'models': Models()})())
    with TestClient(app) as client:
        assert client.post('/interview/question', json={'profile': {}}).status_code == 200
        assert client.post('/interview/roadmap', json={'profile': {}}).status_code == 200
    assert len(prompts) == 2
    assert all('Unique skill guidance for verification' in prompt for prompt in prompts)


def test_coach_and_planner_use_skill_file(monkeypatch, tmp_path):
    skill = tmp_path / 'SKILL.md'
    skill.write_text('Unique skill guidance for coach', encoding='utf-8')
    monkeypatch.setattr('rtw.skills.SKILL_FILE', skill)
    monkeypatch.setattr(coach, 'status', lambda: {'enabled': True, 'reason': ''})
    prompts = []

    def stream(system, message, previous=None):
        prompts.append(system)
        yield 'text', '{"weeks": []}'

    monkeypatch.setattr(coach, '_stream_text', stream)
    list(coach.stream_reply({'message': 'Hello'}))
    list(coach.stream_reply({'message': 'Hello', 'hasPlan': True}))
    coach.build_plan({'profile': {}, 'transcript': [{'role': 'user', 'text': 'I worked in sales.'}]})
    assert len(prompts) == 3
    assert all('Unique skill guidance for coach' in prompt for prompt in prompts)
