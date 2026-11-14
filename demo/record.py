"""Record the demo interview against real Gemini, one step at a time.

    python demo/record.py status            show the question waiting for an answer
    python demo/record.py answer "<text>"   give Melissa's answer and fetch the next question
    python demo/record.py roadmap           fetch and save the roadmap
    python demo/record.py reset             start over

Each Gemini response is saved to demo/recording.json as soon as it arrives, so a
rate limit only stops the run; run the same command again later to continue.
For several picks, join answers with "; "; for a ranking, join them with " > ".
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import app.main  # noqa: E402,F401  loads the API key the same way the app does
from fastapi import HTTPException  # noqa: E402
from app.interview import (QUESTION_REFERENCES, QUESTION_TASK, ROADMAP_REFERENCES, ROADMAP_TASK,  # noqa: E402
                           InterviewRequest, Question, Roadmap, generate)

USER = ROOT / 'demo' / 'user.json'
RECORDING = ROOT / 'demo' / 'recording.json'


def load():
    if RECORDING.exists():
        return json.loads(RECORDING.read_text(encoding='utf-8'))
    profile = json.loads(USER.read_text(encoding='utf-8'))['profile']
    return {'model': os.getenv('GEMINI_MODEL', 'gemini-4-hydrogen'), 'profile': profile, 'steps': [], 'roadmap': None}


def save(rec):
    RECORDING.write_text(json.dumps(rec, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def request(rec):
    turns = [{'question': s['response']['question'], 'answer': s['answer']} for s in rec['steps'] if s['answer']]
    return InterviewRequest(profile=rec['profile'], turns=turns)


def call(rec, schema, task, references):
    try:
        return generate(request(rec), schema, task, references).model_dump()
    except HTTPException as exc:
        sys.exit(f'Gemini call failed ({exc.status_code}): {exc.detail} See the log above for the cause.')


def show(rec):
    if not rec['steps']:
        print('No steps yet. Run: python demo/record.py answer --start')
        return
    step = rec['steps'][-1]
    r = step['response']
    print(f"Step {len(rec['steps'])} ({r['selection']}{', done' if r['done'] else ''})")
    if r['intro']:
        print('Intro:', r['intro'])
    print('Question:', r['question'])
    for option in r['options']:
        print('  -', option)
    print('Answer:', step['answer'] or '(waiting)')
    if rec['roadmap']:
        print('Roadmap recorded.')


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else 'status'
    rec = load()
    if command == 'reset':
        RECORDING.unlink(missing_ok=True)
        print('Recording cleared.')
        return
    if command == 'answer':
        text = sys.argv[2] if len(sys.argv) > 2 else ''
        if rec['steps'] and not rec['steps'][-1]['answer']:
            if not text or text == '--start':
                sys.exit('Give the answer text.')
            if rec['steps'][-1]['response']['done']:
                sys.exit('The intake is done. Run: python demo/record.py roadmap')
            rec['steps'][-1]['answer'] = text
            save(rec)
        rec['steps'].append({'response': call(rec, Question, QUESTION_TASK, QUESTION_REFERENCES), 'answer': None})
        save(rec)
    elif command == 'roadmap':
        rec['roadmap'] = call(rec, Roadmap, ROADMAP_TASK, ROADMAP_REFERENCES)
        save(rec)
    show(rec)


if __name__ == '__main__':
    main()
