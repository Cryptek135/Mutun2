"""Backend tests for Iteration 4: Section/Chapter hierarchy on Bayt model."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

DEVICE = "test_iter4_device"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # cleanup any custom moutoun created
    r = s.get(f"{API}/moutoun", params={"device_id": DEVICE})
    if r.status_code == 200:
        for m in r.json():
            if not m.get("is_preloaded") and m.get("device_id") == DEVICE:
                s.delete(f"{API}/moutoun/{m['id']}", params={"device_id": DEVICE})


# === adhkar-wa-adab section/chapter structure ===
def test_adhkar_has_section_chapter_fields(session):
    r = session.get(f"{API}/moutoun/adhkar-wa-adab")
    assert r.status_code == 200
    data = r.json()
    abyat = data["abyat"]
    assert len(abyat) > 0
    for b in abyat:
        # Must contain keys, can be string or null (never KeyError)
        assert "section" in b
        assert "chapter" in b
        assert b["section"] is None or isinstance(b["section"], str)
        assert b["chapter"] is None or isinstance(b["chapter"], str)


def test_adhkar_has_exactly_2_sections_and_8_chapters(session):
    r = session.get(f"{API}/moutoun/adhkar-wa-adab")
    assert r.status_code == 200
    abyat = r.json()["abyat"]
    sections = {b["section"] for b in abyat if b.get("section")}
    chapters = {b["chapter"] for b in abyat if b.get("chapter")}
    assert len(sections) == 2, f"Expected 2 sections, got {len(sections)}: {sections}"
    assert len(chapters) == 8, f"Expected 8 chapters, got {len(chapters)}: {chapters}"
    assert "Les Invocations" in sections
    assert "Les Convenances (Âdâb)" in sections


# === Other moutoun without section/chapter ===
def test_ousoul_thalatha_section_chapter_null_or_absent(session):
    r = session.get(f"{API}/moutoun/ousoul-thalatha")
    assert r.status_code == 200
    abyat = r.json()["abyat"]
    for b in abyat:
        assert b.get("section") is None
        assert b.get("chapter") is None


def test_arbain_nawawi_section_chapter_null(session):
    r = session.get(f"{API}/moutoun/arbain-nawawi")
    assert r.status_code == 200
    abyat = r.json()["abyat"]
    for b in abyat:
        assert b.get("section") is None
        assert b.get("chapter") is None


# === POST custom matn with section/chapter ===
def test_post_custom_matn_preserves_section_chapter(session):
    payload = {
        "device_id": DEVICE,
        "title_fr": "TEST_Custom Matn iter4",
        "title_ar": "اختبار",
        "category": "autre",
        "abyat": [
            {"arabic": "نص أول", "translation_fr": "Texte 1", "section": "Sec A", "chapter": "Chap 1"},
            {"arabic": "نص ثاني", "translation_fr": "Texte 2", "section": "Sec A", "chapter": "Chap 2"},
            {"arabic": "نص ثالث", "translation_fr": "Texte 3", "section": "Sec B", "chapter": "Chap 3"},
        ],
    }
    r = session.post(f"{API}/moutoun", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["abyat"][0]["section"] == "Sec A"
    assert data["abyat"][0]["chapter"] == "Chap 1"
    assert data["abyat"][2]["section"] == "Sec B"

    # Verify persistence via GET
    matn_id = data["id"]
    r2 = session.get(f"{API}/moutoun/{matn_id}")
    assert r2.status_code == 200
    fetched = r2.json()
    assert fetched["abyat"][1]["chapter"] == "Chap 2"
    assert fetched["abyat"][1]["section"] == "Sec A"


# === PUT update with section/chapter ===
def test_put_matn_with_section_chapter_persists(session):
    create_payload = {
        "device_id": DEVICE,
        "title_fr": "TEST_Update target",
        "title_ar": "تحديث",
        "category": "autre",
        "abyat": [{"arabic": "أ", "translation_fr": "a"}],
    }
    r = session.post(f"{API}/moutoun", json=create_payload)
    assert r.status_code == 200
    matn_id = r.json()["id"]

    update_payload = {
        "abyat": [
            {"arabic": "بيت 1", "translation_fr": "B1", "section": "S1", "chapter": "C1"},
            {"arabic": "بيت 2", "translation_fr": "B2", "section": "S1", "chapter": "C2"},
        ]
    }
    r = session.put(f"{API}/moutoun/{matn_id}", json=update_payload)
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated["abyat"][0]["section"] == "S1"
    assert updated["abyat"][0]["chapter"] == "C1"
    assert updated["abyat"][1]["chapter"] == "C2"
    # verify index is re-applied
    assert updated["abyat"][0]["index"] == 0
    assert updated["abyat"][1]["index"] == 1

    # Verify via GET
    r2 = session.get(f"{API}/moutoun/{matn_id}")
    assert r2.json()["abyat"][1]["section"] == "S1"


def test_put_matn_without_section_chapter_works(session):
    create_payload = {
        "device_id": DEVICE,
        "title_fr": "TEST_No section",
        "title_ar": "بدون",
        "category": "autre",
        "abyat": [{"arabic": "أ", "translation_fr": "a"}],
    }
    r = session.post(f"{API}/moutoun", json=create_payload)
    matn_id = r.json()["id"]

    # All bayt fields optional except arabic + translation_fr
    update_payload = {
        "abyat": [
            {"arabic": "نص", "translation_fr": "Texte"},
            {"arabic": "نص 2", "translation_fr": "Texte 2"},
        ]
    }
    r = session.put(f"{API}/moutoun/{matn_id}", json=update_payload)
    assert r.status_code == 200, r.text
    updated = r.json()
    assert len(updated["abyat"]) == 2
    assert updated["abyat"][0].get("section") is None
    assert updated["abyat"][0].get("chapter") is None


# === Regression: Programs ===
def test_programs_create_and_get_today(session):
    # ensure no leftover - get existing active count
    payload = {
        "device_id": DEVICE,
        "name": "TEST_iter4 program",
        "matn_ids": ["ousoul-thalatha"],
        "duration_days": 5,
        "daily_new_count": 2,
        "include_review": True,
    }
    r = session.post(f"{API}/programs", json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]

    r2 = session.get(f"{API}/programs/detail/{pid}")
    assert r2.status_code == 200
    detail = r2.json()
    assert detail["program"]["id"] == pid
    assert "schedule" in detail
    assert len(detail["schedule"]) == 5

    r3 = session.get(f"{API}/programs/today/{DEVICE}")
    assert r3.status_code == 200
    assert "programs" in r3.json()

    # cleanup
    session.delete(f"{API}/programs/{pid}", params={"device_id": DEVICE})


# === Regression: progress, plan, stats ===
def test_progress_update_works(session):
    payload = {
        "device_id": DEVICE,
        "matn_id": "ousoul-thalatha",
        "bayt_index": 0,
        "action": "learn",
    }
    r = session.post(f"{API}/progress", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ("learning", "memorized")


def test_plan_endpoint(session):
    r = session.get(f"{API}/plan/{DEVICE}")
    assert r.status_code == 200
    data = r.json()
    assert "cycle_day" in data
    assert "due_reviews" in data
    assert "new_suggestions" in data


def test_stats_endpoint(session):
    r = session.get(f"{API}/stats/{DEVICE}")
    assert r.status_code == 200
    data = r.json()
    assert "streak_days" in data
    assert "per_matn" in data
