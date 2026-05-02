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
