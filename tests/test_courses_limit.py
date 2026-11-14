from rtw.courses import MAX_AI_COURSES, MAX_COURSES, _trim


def course(title, url):
    return {'title': title, 'url': url}


def test_courses_are_deduplicated_and_capped():
    picks = [course('Google for Education training', 'a'), course('Google AI Essentials', 'b'),
             course('AI For Everyone', 'c'), course('Google for Education training', 'a'),
             course('Project Management', 'd'), course('Excel basics', 'e'), course('Writing', 'f')]
    out = _trim(picks)
    titles = [c['title'] for c in out]
    assert len(out) == MAX_COURSES
    assert titles.count('Google for Education training') == 1
    assert sum(1 for t in titles if 'AI' in t.split()) == MAX_AI_COURSES
