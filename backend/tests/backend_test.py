"""Backend tests for Moutoun API - iteration 2 (Programs feature + new moutoun)."""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://dars-mutun-platform.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

DEVICE_BASE = "prog_test_v2"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Moutoun preload tests
def test_list_moutoun_returns_8_preloaded(session):
    r = session.get(f"{API}/moutoun")
    assert r.status_code == 200
    data = r.json()
    preloaded = [m for m in data if m.get("is_preloaded")]
    assert len(preloaded) >= 8
    ids = {m["id"] for m in preloaded}
    expected = {
        "ousoul-thalatha", "qawaid-arbaa", "nawaqid-islam", "arbain-nawawi",
        "ajroumiyya", "sittah-ousoul", "oumdat-al-ahkam", "adhkar-wa-adab",
    }
    assert not (expected - ids)
    for m in data:
        assert "_id" not in m


def test_get_sittah_ousoul_has_at_least_10_abyat(session):
    r = session.get(f"{API}/moutoun/sittah-ousoul")
    assert r.status_code == 200
    assert len(r.json()["abyat"]) >= 10


def test_get_oumdat_al_ahkam(session):
    r = session.get(f"{API}/moutoun/oumdat-al-ahkam")
    assert r.status_code == 200
    assert len(r.json()["abyat"]) > 0


def test_get_adhkar_wa_adab(session):
    r = session.get(f"{API}/moutoun/adhkar-wa-adab")
    assert r.status_code == 200
    assert len(r.json()["abyat"]) > 0


def test_arbain_nawawi_has_42_abyat(session):
    r = session.get(f"{API}/moutoun/arbain-nawawi")
    assert r.status_code == 200
    assert len(r.json()["abyat"]) >= 42


# Existing endpoints regression
def test_progress_endpoint_works(session):
    r = session.get(f"{API}/progress/{DEVICE_BASE}_progress")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_plan_endpoint_works(session):
    r = session.get(f"{API}/plan/{DEVICE_BASE}_plan")
    assert r.status_code == 200
    assert "cycle_day" in r.json()


def test_stats_endpoint_works(session):
    r = session.get(f"{API}/stats/{DEVICE_BASE}_stats")
    assert r.status_code == 200
    assert "streak_days" in r.json()


# Programs CRUD tests
@pytest.fixture
def device_id(request):
    name = request.node.name.replace("[", "_").replace("]", "_")
    did = f"{DEVICE_BASE}_{name[:40]}"
    yield did
    try:
        s = requests.Session()
        progs = s.get(f"{API}/programs/{did}").json()
        for p in progs:
            s.delete(f"{API}/programs/{p['id']}", params={"device_id": did})
    except Exception:
        pass


def _payload(device_id, **overrides):
    p = {
        "device_id": device_id,
        "name": "Test Program",
        "matn_ids": ["ousoul-thalatha", "qawaid-arbaa"],
        "duration_days": 30,
        "daily_new_count": 2,
        "include_review": True,
    }
    p.update(overrides)
    return p


def test_create_program_success(session, device_id):
    r = session.post(f"{API}/programs", json=_payload(device_id))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["device_id"] == device_id
    assert data["status"] == "active"
    assert "start_date" in data and "end_date" in data
    assert "_id" not in data
    list_r = session.get(f"{API}/programs/{device_id}")
    assert list_r.status_code == 200
    assert any(p["id"] == data["id"] for p in list_r.json())
    for p in list_r.json():
        assert "_id" not in p


def test_create_program_empty_matn_ids_400(session, device_id):
    r = session.post(f"{API}/programs", json=_payload(device_id, matn_ids=[]))
    assert r.status_code == 400


def test_create_program_invalid_duration_low(session, device_id):
    r = session.post(f"{API}/programs", json=_payload(device_id, duration_days=0))
    assert r.status_code == 400


def test_create_program_invalid_duration_high(session, device_id):
    r = session.post(f"{API}/programs", json=_payload(device_id, duration_days=400))
    assert r.status_code == 400


def test_create_program_invalid_daily_new_low(session, device_id):
    r = session.post(f"{API}/programs", json=_payload(device_id, daily_new_count=0))
    assert r.status_code == 400


def test_create_program_invalid_daily_new_high(session, device_id):
    r = session.post(f"{API}/programs", json=_payload(device_id, daily_new_count=25))
    assert r.status_code == 400


def test_create_6th_active_program_rejected(session, device_id):
    for i in range(5):
        r = session.post(f"{API}/programs", json=_payload(device_id, name=f"P{i}"))
        assert r.status_code == 200, f"P{i}: {r.text}"
    r = session.post(f"{API}/programs", json=_payload(device_id, name="P6"))
    assert r.status_code == 400


def test_list_programs_sorted_desc(session, device_id):
    ids = []
    for i in range(3):
        r = session.post(f"{API}/programs", json=_payload(device_id, name=f"P{i}"))
        ids.append(r.json()["id"])
    progs = session.get(f"{API}/programs/{device_id}").json()
    found = [p["id"] for p in progs]
    assert found.index(ids[-1]) < found.index(ids[0])


def test_program_detail_schedule(session, device_id):
    pid = session.post(f"{API}/programs", json=_payload(device_id, duration_days=10, daily_new_count=2)).json()["id"]
    r = session.get(f"{API}/programs/detail/{pid}")
    assert r.status_code == 200
    data = r.json()
    assert len(data["schedule"]) == 10
    assert data["today_index"] == 0
    assert "progress_percent" in data
    today = data["today_items"]
    assert today and "new_items" in today
    if today["new_items"]:
        item = today["new_items"][0]
        assert "arabic" in item and "translation_fr" in item
    assert "_id" not in data["program"]


def test_patch_program_pause(session, device_id):
    pid = session.post(f"{API}/programs", json=_payload(device_id)).json()["id"]
    r = session.patch(f"{API}/programs/{pid}", params={"device_id": device_id, "status": "paused"})
    assert r.status_code == 200
    p = next(p for p in session.get(f"{API}/programs/{device_id}").json() if p["id"] == pid)
    assert p["status"] == "paused"


def test_patch_active_when_5_already_active_rejected(session, device_id):
    ids = []
    for i in range(5):
        r = session.post(f"{API}/programs", json=_payload(device_id, name=f"A{i}"))
        ids.append(r.json()["id"])
    # Pause #1
    session.patch(f"{API}/programs/{ids[1]}", params={"device_id": device_id, "status": "paused"})
    # Create another -> back to 5 active
    new_p = session.post(f"{API}/programs", json=_payload(device_id, name="Anew"))
    assert new_p.status_code == 200
    # Try reactivating paused -> would be 6 active -> should fail
    r = session.patch(f"{API}/programs/{ids[1]}", params={"device_id": device_id, "status": "active"})
    assert r.status_code == 400


def test_delete_program(session, device_id):
    pid = session.post(f"{API}/programs", json=_payload(device_id)).json()["id"]
    r = session.delete(f"{API}/programs/{pid}", params={"device_id": device_id})
    assert r.status_code == 200
    assert all(p["id"] != pid for p in session.get(f"{API}/programs/{device_id}").json())


def test_delete_nonexistent_404(session, device_id):
    r = session.delete(f"{API}/programs/nonexistent-id-xyz", params={"device_id": device_id})
    assert r.status_code == 404


def test_today_active_programs(session, device_id):
    p1 = session.post(f"{API}/programs", json=_payload(device_id, name="Active1")).json()
    p2 = session.post(f"{API}/programs", json=_payload(device_id, name="Paused1")).json()
    session.patch(f"{API}/programs/{p2['id']}", params={"device_id": device_id, "status": "paused"})
    r = session.get(f"{API}/programs/today/{device_id}")
    assert r.status_code == 200
    pids = [p["program_id"] for p in r.json()["programs"]]
    assert p1["id"] in pids and p2["id"] not in pids


# ============ PUT /api/moutoun/{id} tests (iteration 3) ============

EDIT_DEVICE = "edit_test_v3"


@pytest.fixture
def custom_matn(session):
    """Create a custom matn for editing tests; cleans up after."""
    payload = {
        "device_id": EDIT_DEVICE,
        "title_fr": "Test Matn Edit",
        "title_ar": "متن اختبار",
        "author_fr": "Test Author",
        "author_ar": "مؤلف",
        "category": "autre",
        "level": "Débutant",
        "description_fr": "desc initiale",
        "abyat": [
            {"index": 0, "arabic": "بيت أول", "translation_fr": "vers 1"},
            {"index": 1, "arabic": "بيت ثاني", "translation_fr": "vers 2"},
        ],
    }
    r = session.post(f"{API}/moutoun", json=payload)
    assert r.status_code == 200
    matn = r.json()
    yield matn
    try:
        session.delete(f"{API}/moutoun/{matn['id']}", params={"device_id": EDIT_DEVICE})
    except Exception:
        pass


def test_put_custom_matn_updates_fields(session, custom_matn):
    body = {
        "title_fr": "Titre modifié",
        "title_ar": "عنوان معدل",
        "author_fr": "Nouvel auteur",
        "description_fr": "nouvelle description",
        # NOTE: index sent explicitly because Bayt model requires it (spec says it should be optional).
        "abyat": [
            {"index": 0, "arabic": "جديد1", "translation_fr": "nouveau 1"},
            {"index": 0, "arabic": "جديد2", "translation_fr": "nouveau 2"},
            {"index": 0, "arabic": "جديد3", "translation_fr": "nouveau 3"},
        ],
    }
    r = session.put(f"{API}/moutoun/{custom_matn['id']}", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title_fr"] == "Titre modifié"
    assert data["title_ar"] == "عنوان معدل"
    assert data["author_fr"] == "Nouvel auteur"
    assert data["description_fr"] == "nouvelle description"
    assert len(data["abyat"]) == 3
    assert "_id" not in data
    # GET to verify persistence
    g = session.get(f"{API}/moutoun/{custom_matn['id']}")
    assert g.status_code == 200
    fetched = g.json()
    assert fetched["title_fr"] == "Titre modifié"
    assert len(fetched["abyat"]) == 3


def test_put_reindexes_abyat_sequentially(session, custom_matn):
    body = {
        "abyat": [
            {"index": 99, "arabic": "a", "translation_fr": "x"},
            {"index": 5, "arabic": "b", "translation_fr": "y"},
            {"index": 42, "arabic": "c", "translation_fr": "z"},
        ],
    }
    r = session.put(f"{API}/moutoun/{custom_matn['id']}", json=body)
    assert r.status_code == 200
    indices = [b["index"] for b in r.json()["abyat"]]
    assert indices == [0, 1, 2]


def test_put_404_for_nonexistent(session):
    r = session.put(f"{API}/moutoun/does-not-exist-xyz", json={"title_fr": "x"})
    assert r.status_code == 404


def test_put_partial_body_only_updates_provided(session, custom_matn):
    # only description_fr; abyat must stay unchanged
    original_abyat = custom_matn["abyat"]
    r = session.put(f"{API}/moutoun/{custom_matn['id']}", json={"description_fr": "partial only"})
    assert r.status_code == 200
    data = r.json()
    assert data["description_fr"] == "partial only"
    assert data["title_fr"] == custom_matn["title_fr"]
    assert len(data["abyat"]) == len(original_abyat)
    assert data["abyat"][0]["arabic"] == original_abyat[0]["arabic"]


def test_put_preloaded_matn_allowed_and_revertible(session):
    """Edit arbain-nawawi then revert to ensure preloaded edits work and clean up."""
    matn_id = "arbain-nawawi"
    original = session.get(f"{API}/moutoun/{matn_id}").json()
    try:
        new_desc = "Edited by test - description override"
        r = session.put(f"{API}/moutoun/{matn_id}", json={"description_fr": new_desc})
        assert r.status_code == 200, r.text
        assert r.json()["description_fr"] == new_desc
        # GET to confirm persistence
        g = session.get(f"{API}/moutoun/{matn_id}")
        assert g.status_code == 200
        assert g.json()["description_fr"] == new_desc
        # Title and abyat should be intact
        assert g.json()["title_fr"] == original["title_fr"]
        assert len(g.json()["abyat"]) == len(original["abyat"])
    finally:
        # Revert to original to keep DB clean for downstream tests
        revert_body = {
            "title_fr": original["title_fr"],
            "title_ar": original["title_ar"],
            "author_fr": original.get("author_fr", ""),
            "author_ar": original.get("author_ar", ""),
            "category": original.get("category", "autre"),
            "level": original.get("level", "Débutant"),
            "description_fr": original.get("description_fr", ""),
            "abyat": [{"arabic": b["arabic"], "translation_fr": b["translation_fr"]} for b in original["abyat"]],
        }
        session.put(f"{API}/moutoun/{matn_id}", json=revert_body)


def test_put_preloaded_persists_after_seed_rerun(session):
    """Edit a preloaded matn (sittah-ousoul), then trigger code path that calls ensure_preloaded_in_db.
    Since seed runs at startup, we cannot force a rerun easily; instead we rely on the seed_version=9999
    semantics by verifying the change persists across multiple GETs (sanity) and revert.
    """
    matn_id = "sittah-ousoul"
    original = session.get(f"{API}/moutoun/{matn_id}").json()
    sentinel = "SEED_VERSION_TEST_PERSIST"
    try:
        r = session.put(f"{API}/moutoun/{matn_id}", json={"description_fr": sentinel})
        assert r.status_code == 200
        for _ in range(3):
            g = session.get(f"{API}/moutoun/{matn_id}")
            assert g.json()["description_fr"] == sentinel
        # Also via list endpoint
        lst = session.get(f"{API}/moutoun").json()
        m = next(x for x in lst if x["id"] == matn_id)
        assert m["description_fr"] == sentinel
    finally:
        revert_body = {
            "title_fr": original["title_fr"],
            "title_ar": original["title_ar"],
            "author_fr": original.get("author_fr", ""),
            "author_ar": original.get("author_ar", ""),
            "category": original.get("category", "autre"),
            "level": original.get("level", "Débutant"),
            "description_fr": original.get("description_fr", ""),
            "abyat": [{"arabic": b["arabic"], "translation_fr": b["translation_fr"]} for b in original["abyat"]],
        }
        session.put(f"{API}/moutoun/{matn_id}", json=revert_body)


def test_put_abyat_index_optional_per_spec(session, custom_matn):
    """Spec says index is optional and server re-indexes. Currently fails because Bayt model requires index."""
    body = {"abyat": [
        {"arabic": "a", "translation_fr": "x"},
        {"arabic": "b", "translation_fr": "y"},
    ]}
    r = session.put(f"{API}/moutoun/{custom_matn['id']}", json=body)
    # Per spec this should succeed; documenting current behavior:
    assert r.status_code == 200, (
        f"BUG: spec says abyat[].index is optional and server re-indexes, but PUT returned {r.status_code}: {r.text}"
    )


def test_get_after_put_returns_updated(session, custom_matn):
    body = {"title_fr": "Updated Title GET-check"}
    session.put(f"{API}/moutoun/{custom_matn['id']}", json=body)
    g = session.get(f"{API}/moutoun/{custom_matn['id']}")
    assert g.status_code == 200
    assert g.json()["title_fr"] == "Updated Title GET-check"


def test_put_does_not_break_programs_endpoints(session):
    """Regression: after PUT activity, POST /api/programs and GET /api/programs/today/{device_id} still work."""
    did = f"{EDIT_DEVICE}_regression"
    # Cleanup any previous
    try:
        for p in session.get(f"{API}/programs/{did}").json():
            session.delete(f"{API}/programs/{p['id']}", params={"device_id": did})
    except Exception:
        pass
    payload = {
        "device_id": did,
        "name": "Regression Prog",
        "matn_ids": ["ousoul-thalatha"],
        "duration_days": 5,
        "daily_new_count": 1,
        "include_review": True,
    }
    r = session.post(f"{API}/programs", json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    today_r = session.get(f"{API}/programs/today/{did}")
    assert today_r.status_code == 200
    assert any(p["program_id"] == pid for p in today_r.json()["programs"])
    session.delete(f"{API}/programs/{pid}", params={"device_id": did})


def test_get_moutoun_returns_8_preloaded_unchanged_after_edits(session):
    """Regression: list endpoint still returns all 8 preloaded ids."""
    r = session.get(f"{API}/moutoun")
    assert r.status_code == 200
    ids = {m["id"] for m in r.json() if m.get("is_preloaded")}
    expected = {
        "ousoul-thalatha", "qawaid-arbaa", "nawaqid-islam", "arbain-nawawi",
        "ajroumiyya", "sittah-ousoul", "oumdat-al-ahkam", "adhkar-wa-adab",
    }
    assert expected.issubset(ids)
