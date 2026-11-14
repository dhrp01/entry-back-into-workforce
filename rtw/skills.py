"""Load the shared, editable career interview guidance."""
from pathlib import Path

SKILL_FILE = Path(__file__).resolve().parent.parent / 'skills' / 'SKILL.md'


def load_skill_guidance():
    """Read on every request so edits apply without restarting the server."""
    return SKILL_FILE.read_text(encoding='utf-8')
