from rtw import jobs


def test_location_filter_applies_before_result_limit_and_keeps_distinct_locations(monkeypatch):
    def job(location):
        return {"title": "Software engineer", "company": "Example", "location": location,
                "remote": False, "url": "https://example.com/job", "tags": [],
                "description": "", "posted": "", "type": "", "salary": "", "source": "test"}

    monkeypatch.setattr(jobs, "_cached", lambda key, loader: loader())
    monkeypatch.setattr(jobs, "_remotive", lambda role: [job("London"), job("Salt Lake City, Utah"), job("Provo, Utah")])
    monkeypatch.setattr(jobs, "_arbeitnow", lambda role: [])
    monkeypatch.setattr(jobs, "_remoteok", lambda role: [])
    monkeypatch.setattr(jobs, "adzuna_enabled", lambda: False)
    profile = {"targetRole": "Software engineer"}

    result = jobs.find_jobs(profile, "UTAH")
    assert {j["location"] for j in result["jobs"]} == {"Salt Lake City, Utah", "Provo, Utah"}
    assert len(jobs.find_jobs(profile)["jobs"]) == 3


def test_previous_role_is_searched_and_generic_title_words_do_not_imply_a_match(monkeypatch):
    def job(title):
        return {"title": title, "company": "Example", "location": "Utah", "remote": False,
                "url": "https://example.com/job", "tags": [], "description": "", "posted": "",
                "type": "", "salary": "", "source": "test"}

    queries = []
    def remotive(role):
        queries.append(role)
        return [job("Marketing manager"), job("Marketing controller"), job("Sales manager")]

    monkeypatch.setattr(jobs, "_cached", lambda key, loader: loader())
    monkeypatch.setattr(jobs, "_remotive", remotive)
    monkeypatch.setattr(jobs, "_arbeitnow", lambda role: [])
    monkeypatch.setattr(jobs, "_remoteok", lambda role: [])
    monkeypatch.setattr(jobs, "adzuna_enabled", lambda: False)
    result = jobs.find_jobs({"targetRole": "Project manager", "lastRole": "Marketing manager"})
    assert set(queries) == {"Project manager", "Marketing manager"}
    by_title = {j["title"]: j for j in result["jobs"]}
    assert "Sales manager" not in by_title
    assert "Title matches your previous role" in by_title["Marketing manager"]["reasons"]
    assert "Marketing controller" not in by_title


def test_usajobs_normalizes_multiple_locations_and_auth(monkeypatch):
    monkeypatch.setenv("USAJOBS_EMAIL", "developer@example.com")
    monkeypatch.setenv("USAJOBS_API_KEY", "test-key")
    def get_json(url, timeout=15, headers=None):
        assert "LocationName=Utah" in url
        assert headers["Authorization-Key"] == "test-key"
        return {"SearchResult": {"SearchResultItems": [{"MatchedObjectDescriptor": {
            "PositionTitle": "Project Manager", "OrganizationName": "Agency",
            "PositionURI": "https://www.usajobs.gov/job/123",
            "PositionLocation": [{"LocationName": "Salt Lake City, Utah"}, {"LocationName": "Ogden, Utah"}],
            "UserArea": {"Details": {"RemoteIndicator": True, "JobSummary": "Manage projects"}},
            "PublicationStartDate": "2026-01-01T00:00:00Z"}}]}}
    monkeypatch.setattr(jobs, "_get_json", get_json)
    result = jobs._usajobs("Project Manager", "Utah")
    assert [j["location"] for j in result] == ["Salt Lake City, Utah", "Ogden, Utah"]
    assert all(j["remote"] and j["source"] == "USAJOBS" for j in result)

