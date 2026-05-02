from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta, date

from emergentintegrations.llm.chat import LlmChat, UserMessage

from matn_data import PRELOADED_MOUTOUN


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============ Models ============

class Bayt(BaseModel):
    index: int
    arabic: str
    translation_fr: str


class MatnBase(BaseModel):
    title_fr: str
    title_ar: str
    author_fr: Optional[str] = ""
    author_ar: Optional[str] = ""
    category: str = "autre"
    level: Optional[str] = "Débutant"
    description_fr: Optional[str] = ""
    abyat: List[Bayt] = []


class Matn(MatnBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_preloaded: bool = False
    device_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MatnCreate(MatnBase):
    device_id: str


class ProgressItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    matn_id: str
    bayt_index: int
    status: Literal["learning", "memorized"] = "learning"
    review_count: int = 0
    srs_level: int = 0  # 0=new, 1=1d, 2=3d, 3=7d, 4=14d, 5=30d
    last_reviewed: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    next_review: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    first_learned: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProgressUpdate(BaseModel):
    device_id: str
    matn_id: str
    bayt_index: int
    action: Literal["learn", "review_good", "review_hard", "reset"]


class AIChatRequest(BaseModel):
    device_id: str
    matn_id: Optional[str] = None
    bayt_index: Optional[int] = None
    message: str
    mode: Literal["explain", "questions", "free"] = "free"


class ProgramCreate(BaseModel):
    device_id: str
    name: str
    matn_ids: List[str]  # selected moutoun
    duration_days: int  # total days
    daily_new_count: int = 2  # new abyat per day
    include_review: bool = True


class Program(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    name: str
    matn_ids: List[str]
    start_date: str  # ISO date (YYYY-MM-DD)
    end_date: str
    duration_days: int
    daily_new_count: int
    include_review: bool = True
    status: Literal["active", "paused", "completed"] = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============ Helpers ============

SRS_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 60]


def compute_next_review(srs_level: int) -> str:
    days = SRS_INTERVALS_DAYS[min(srs_level, len(SRS_INTERVALS_DAYS) - 1)]
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def get_or_create_device_stats(device_id: str) -> dict:
    stats = await db.device_stats.find_one({"device_id": device_id}, {"_id": 0})
    if not stats:
        today = datetime.now(timezone.utc).date().isoformat()
        stats = {
            "device_id": device_id,
            "streak_days": 0,
            "last_active_date": None,
            "total_sessions": 0,
            "cycle_start_date": today,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.device_stats.insert_one(dict(stats))
    return stats


async def update_streak(device_id: str):
    stats = await get_or_create_device_stats(device_id)
    today = datetime.now(timezone.utc).date()
    last = stats.get("last_active_date")
    streak = stats.get("streak_days", 0)

    if last is None:
        streak = 1
    else:
        last_date = date.fromisoformat(last)
        delta = (today - last_date).days
        if delta == 0:
            pass  # same day
        elif delta == 1:
            streak += 1
        else:
            streak = 1

    await db.device_stats.update_one(
        {"device_id": device_id},
        {"$set": {
            "last_active_date": today.isoformat(),
            "streak_days": streak,
            "total_sessions": stats.get("total_sessions", 0) + 1,
        }},
    )


async def ensure_preloaded_in_db():
    """Seed/refresh preloaded moutoun. Only updates if seed_version is newer (preserves user edits)."""
    SEED_VERSION = 2  # bump this when matn content is updated upstream
    for m in PRELOADED_MOUTOUN:
        existing = await db.moutoun.find_one({"id": m["id"]}, {"_id": 0})
        if not existing:
            doc = {**m, "is_preloaded": True, "device_id": None,
                   "seed_version": SEED_VERSION,
                   "created_at": datetime.now(timezone.utc).isoformat()}
            await db.moutoun.insert_one(doc)
            continue
        existing_version = existing.get("seed_version", 1)
        # If user has edited (seed_version 9999), never overwrite
        if existing_version >= 9999:
            continue
        if existing_version < SEED_VERSION:
            doc = {**m, "is_preloaded": True, "device_id": None,
                   "seed_version": SEED_VERSION,
                   "created_at": existing.get("created_at", datetime.now(timezone.utc).isoformat())}
            await db.moutoun.update_one({"id": m["id"]}, {"$set": doc})


# ============ Routes ============

@api_router.get("/")
async def root():
    return {"message": "Moutoun API", "status": "ok"}


@api_router.get("/moutoun", response_model=List[Matn])
async def list_moutoun(device_id: Optional[str] = None):
    """List all moutoun: preloaded + user-created for this device."""
    query = {"$or": [{"is_preloaded": True}]}
    if device_id:
        query["$or"].append({"device_id": device_id})
    docs = await db.moutoun.find(query, {"_id": 0}).to_list(500)
    return docs


@api_router.get("/moutoun/{matn_id}", response_model=Matn)
async def get_matn(matn_id: str):
    doc = await db.moutoun.find_one({"id": matn_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Matn introuvable")
    return doc


@api_router.post("/moutoun", response_model=Matn)
async def create_matn(payload: MatnCreate):
    matn = Matn(**payload.model_dump(), is_preloaded=False)
    await db.moutoun.insert_one(matn.model_dump())
    return matn


class MatnUpdate(BaseModel):
    title_fr: Optional[str] = None
    title_ar: Optional[str] = None
    author_fr: Optional[str] = None
    author_ar: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    description_fr: Optional[str] = None
    abyat: Optional[List[Bayt]] = None


@api_router.put("/moutoun/{matn_id}", response_model=Matn)
async def update_matn(matn_id: str, payload: MatnUpdate):
    existing = await db.moutoun.find_one({"id": matn_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Matn introuvable")
    update_doc = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "abyat" in update_doc:
        # Re-index abyat sequentially
        for i, b in enumerate(update_doc["abyat"]):
            b["index"] = i
    # Mark as user-edited so future seed runs don't overwrite
    update_doc["seed_version"] = 9999
    await db.moutoun.update_one({"id": matn_id}, {"$set": update_doc})
    updated = await db.moutoun.find_one({"id": matn_id}, {"_id": 0})
    return updated


@api_router.delete("/moutoun/{matn_id}")
async def delete_matn(matn_id: str, device_id: str):
    doc = await db.moutoun.find_one({"id": matn_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Matn introuvable")
    if doc.get("is_preloaded"):
        raise HTTPException(status_code=403, detail="Les moutoun préchargés ne peuvent pas être supprimés")
    if doc.get("device_id") != device_id:
        raise HTTPException(status_code=403, detail="Non autorisé")
    await db.moutoun.delete_one({"id": matn_id})
    await db.progress.delete_many({"matn_id": matn_id, "device_id": device_id})
    return {"ok": True}


@api_router.get("/progress/{device_id}")
async def get_progress(device_id: str, matn_id: Optional[str] = None):
    query = {"device_id": device_id}
    if matn_id:
        query["matn_id"] = matn_id
    docs = await db.progress.find(query, {"_id": 0}).to_list(5000)
    return docs


@api_router.post("/progress")
async def update_progress(payload: ProgressUpdate):
    existing = await db.progress.find_one(
        {"device_id": payload.device_id, "matn_id": payload.matn_id, "bayt_index": payload.bayt_index}
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    if payload.action == "reset":
        if existing:
            await db.progress.delete_one({"_id": existing["_id"]})
        return {"ok": True, "action": "reset"}

    if not existing:
        item = ProgressItem(
            device_id=payload.device_id,
            matn_id=payload.matn_id,
            bayt_index=payload.bayt_index,
            status="learning" if payload.action == "learn" else "memorized",
            srs_level=1 if payload.action == "learn" else 2,
            review_count=1,
        )
        item.next_review = compute_next_review(item.srs_level)
        await db.progress.insert_one(item.model_dump())
        await update_streak(payload.device_id)
        return item.model_dump()

    srs_level = existing.get("srs_level", 0)
    review_count = existing.get("review_count", 0) + 1
    if payload.action == "learn":
        srs_level = max(srs_level, 1)
        status = "learning"
    elif payload.action == "review_good":
        srs_level = min(srs_level + 1, len(SRS_INTERVALS_DAYS) - 1)
        status = "memorized" if srs_level >= 3 else "learning"
    else:  # review_hard
        srs_level = max(srs_level - 1, 1)
        status = "learning"

    update_doc = {
        "status": status,
        "srs_level": srs_level,
        "review_count": review_count,
        "last_reviewed": now_iso,
        "next_review": compute_next_review(srs_level),
    }
    await db.progress.update_one({"_id": existing["_id"]}, {"$set": update_doc})
    await update_streak(payload.device_id)
    return {**{k: v for k, v in existing.items() if k != "_id"}, **update_doc}


@api_router.get("/plan/{device_id}")
async def get_daily_plan(device_id: str):
    """Return today's plan: due reviews + new abyat suggestions. Detects Tamrin day."""
    stats = await get_or_create_device_stats(device_id)
    today = datetime.now(timezone.utc).date()
    cycle_start = date.fromisoformat(stats["cycle_start_date"])
    cycle_day = ((today - cycle_start).days % 5) + 1
    is_tamrin_day = cycle_day == 5

    progress_docs = await db.progress.find({"device_id": device_id}, {"_id": 0}).to_list(5000)
    now = datetime.now(timezone.utc)

    due_reviews = []
    all_learned = []
    for p in progress_docs:
        next_review = datetime.fromisoformat(p["next_review"])
        all_learned.append(p)
        if next_review <= now:
            due_reviews.append(p)

    # New abyat suggestions: first un-learned bayt from each active matn (non-tamrin day)
    new_suggestions = []
    if not is_tamrin_day:
        learned_keys = {(p["matn_id"], p["bayt_index"]) for p in progress_docs}
        matn_with_progress = {p["matn_id"] for p in progress_docs}
        moutoun = await db.moutoun.find({}, {"_id": 0}).to_list(500)
        for m in moutoun:
            if not m["abyat"]:
                continue
            if matn_with_progress and m["id"] not in matn_with_progress:
                continue
            for b in m["abyat"]:
                if (m["id"], b["index"]) not in learned_keys:
                    new_suggestions.append({
                        "matn_id": m["id"],
                        "matn_title_fr": m["title_fr"],
                        "matn_title_ar": m["title_ar"],
                        "bayt_index": b["index"],
                        "arabic": b["arabic"],
                        "translation_fr": b["translation_fr"],
                    })
                    break
            if len(new_suggestions) >= 3:
                break
        # If no active matn, suggest from first preloaded
        if not new_suggestions:
            moutoun_pre = [m for m in moutoun if m.get("is_preloaded")]
            if moutoun_pre:
                m = moutoun_pre[0]
                if m["abyat"]:
                    b = m["abyat"][0]
                    new_suggestions.append({
                        "matn_id": m["id"],
                        "matn_title_fr": m["title_fr"],
                        "matn_title_ar": m["title_ar"],
                        "bayt_index": b["index"],
                        "arabic": b["arabic"],
                        "translation_fr": b["translation_fr"],
                    })

    # Enrich due_reviews with bayt content
    enriched_reviews = []
    matn_cache = {}
    for p in due_reviews:
        if p["matn_id"] not in matn_cache:
            m = await db.moutoun.find_one({"id": p["matn_id"]}, {"_id": 0})
            matn_cache[p["matn_id"]] = m
        m = matn_cache[p["matn_id"]]
        if not m:
            continue
        bayt = next((b for b in m["abyat"] if b["index"] == p["bayt_index"]), None)
        if bayt:
            enriched_reviews.append({
                **p,
                "matn_title_fr": m["title_fr"],
                "matn_title_ar": m["title_ar"],
                "arabic": bayt["arabic"],
                "translation_fr": bayt["translation_fr"],
            })

    # Tamrin: all learned abyat
    tamrin_items = []
    if is_tamrin_day:
        for p in all_learned:
            if p["matn_id"] not in matn_cache:
                m = await db.moutoun.find_one({"id": p["matn_id"]}, {"_id": 0})
                matn_cache[p["matn_id"]] = m
            m = matn_cache[p["matn_id"]]
            if not m:
                continue
            bayt = next((b for b in m["abyat"] if b["index"] == p["bayt_index"]), None)
            if bayt:
                tamrin_items.append({
                    "matn_id": p["matn_id"],
                    "matn_title_fr": m["title_fr"],
                    "matn_title_ar": m["title_ar"],
                    "bayt_index": p["bayt_index"],
                    "arabic": bayt["arabic"],
                    "translation_fr": bayt["translation_fr"],
                    "srs_level": p["srs_level"],
                })

    return {
        "cycle_day": cycle_day,
        "is_tamrin_day": is_tamrin_day,
        "days_until_tamrin": 5 - cycle_day if not is_tamrin_day else 0,
        "due_reviews": enriched_reviews,
        "new_suggestions": new_suggestions,
        "tamrin_items": tamrin_items,
        "total_learned": len(all_learned),
    }


@api_router.get("/stats/{device_id}")
async def get_stats(device_id: str):
    stats = await get_or_create_device_stats(device_id)
    progress = await db.progress.find({"device_id": device_id}, {"_id": 0}).to_list(5000)

    moutoun = await db.moutoun.find({}, {"_id": 0}).to_list(500)
    matn_dict = {m["id"]: m for m in moutoun}

    by_matn = {}
    for p in progress:
        mid = p["matn_id"]
        if mid not in by_matn:
            by_matn[mid] = {"learning": 0, "memorized": 0, "total_abyat": 0}
        by_matn[mid][p["status"]] += 1

    per_matn_progress = []
    for mid, counts in by_matn.items():
        m = matn_dict.get(mid)
        if not m:
            continue
        total = len(m["abyat"])
        done = counts["learning"] + counts["memorized"]
        per_matn_progress.append({
            "matn_id": mid,
            "title_fr": m["title_fr"],
            "title_ar": m["title_ar"],
            "learning": counts["learning"],
            "memorized": counts["memorized"],
            "total": total,
            "percent": round((done / total) * 100) if total else 0,
        })

    total_memorized = sum(1 for p in progress if p["status"] == "memorized")
    total_learning = sum(1 for p in progress if p["status"] == "learning")

    return {
        "streak_days": stats.get("streak_days", 0),
        "last_active_date": stats.get("last_active_date"),
        "total_sessions": stats.get("total_sessions", 0),
        "total_memorized": total_memorized,
        "total_learning": total_learning,
        "active_moutoun": len(per_matn_progress),
        "per_matn": per_matn_progress,
    }


@api_router.post("/ai/chat")
async def ai_chat(payload: AIChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé LLM non configurée")

    # Build context from matn/bayt if provided
    context_parts = []
    if payload.matn_id:
        m = await db.moutoun.find_one({"id": payload.matn_id}, {"_id": 0})
        if m:
            context_parts.append(f"Matn : {m['title_fr']} ({m['title_ar']}) — auteur : {m.get('author_fr', '')}")
            if payload.bayt_index is not None:
                bayt = next((b for b in m["abyat"] if b["index"] == payload.bayt_index), None)
                if bayt:
                    context_parts.append(f"Passage concerné :\n  Arabe : {bayt['arabic']}\n  Traduction : {bayt['translation_fr']}")
            else:
                # Include full matn (short)
                context_parts.append("Contenu complet du matn :")
                for b in m["abyat"][:15]:
                    context_parts.append(f"  - {b['arabic']} → {b['translation_fr']}")

    context = "\n".join(context_parts)

    mode_instructions = {
        "explain": "Explique ce passage de manière claire et pédagogique, en t'appuyant sur les sciences islamiques classiques. Sois concis mais rigoureux.",
        "questions": "Génère 3 à 5 questions de révision pertinentes sur ce passage pour vérifier la compréhension de l'étudiant. Numérote-les.",
        "free": "Réponds à la question de l'étudiant avec précision, en t'appuyant sur les sciences islamiques classiques quand c'est pertinent.",
    }

    system_message = (
        "Tu es un assistant pédagogique pour un étudiant en sciences islamiques (talib al-'ilm) "
        "qui apprend les moutoun classiques. Tu réponds en français, avec respect, rigueur et pédagogie. "
        "Tu t'appuies sur la compréhension des savants sunnites classiques. "
        f"{mode_instructions.get(payload.mode, mode_instructions['free'])}\n\n"
        f"Contexte :\n{context}" if context else
        "Tu es un assistant pédagogique pour un étudiant en sciences islamiques qui apprend les moutoun classiques. "
        "Tu réponds en français, avec respect et rigueur."
    )

    session_id = f"{payload.device_id}_{payload.matn_id or 'global'}"

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        user_msg = UserMessage(text=payload.message)
        response = await chat.send_message(user_msg)

        # Persist chat
        await db.ai_chat_history.insert_one({
            "device_id": payload.device_id,
            "matn_id": payload.matn_id,
            "bayt_index": payload.bayt_index,
            "mode": payload.mode,
            "user_message": payload.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.exception("AI chat error")
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")


# ============ Programs (calendar/personalized) ============

MAX_ACTIVE_PROGRAMS = 5


def _flatten_program_schedule(program: dict, moutoun_dict: dict) -> List[dict]:
    """Build the day-by-day schedule for a program.
    Returns a list of {day_index, date, items: [{matn_id, bayt_index, type: 'new'|'review'}]}
    """
    matn_ids = program["matn_ids"]
    duration = program["duration_days"]
    daily_new = program["daily_new_count"]
    start_date = date.fromisoformat(program["start_date"])

    # Build the ordered queue of all (matn_id, bayt_index) pairs across moutoun (round-robin)
    queues = []
    for mid in matn_ids:
        m = moutoun_dict.get(mid)
        if not m:
            continue
        queues.append([(mid, b["index"]) for b in m["abyat"]])

    interleaved = []
    if queues:
        max_len = max(len(q) for q in queues)
        for i in range(max_len):
            for q in queues:
                if i < len(q):
                    interleaved.append(q[i])

    schedule = []
    learned_so_far = []
    for day in range(duration):
        new_items = interleaved[day * daily_new : (day + 1) * daily_new]
        review_items = []
        if program.get("include_review", True):
            # Simple review: re-show abyat learned 1, 3, 7 days ago
            for offset in [1, 3, 7]:
                if day - offset >= 0:
                    rev_start = (day - offset) * daily_new
                    rev_end = rev_start + daily_new
                    review_items.extend(interleaved[rev_start:rev_end])
        schedule.append({
            "day_index": day,
            "date": (start_date + timedelta(days=day)).isoformat(),
            "new_items": [{"matn_id": mid, "bayt_index": idx} for mid, idx in new_items],
            "review_items": [{"matn_id": mid, "bayt_index": idx} for mid, idx in review_items],
        })
        learned_so_far.extend(new_items)
    return schedule


async def _enrich_schedule_items(schedule: List[dict], moutoun_dict: dict) -> List[dict]:
    """Add Arabic, French translation and matn title to each item."""
    enriched = []
    for day in schedule:
        new_e = []
        rev_e = []
        for item in day["new_items"]:
            m = moutoun_dict.get(item["matn_id"])
            if not m:
                continue
            b = next((b for b in m["abyat"] if b["index"] == item["bayt_index"]), None)
            if b:
                new_e.append({**item, "arabic": b["arabic"], "translation_fr": b["translation_fr"],
                             "matn_title_fr": m["title_fr"], "matn_title_ar": m["title_ar"]})
        for item in day["review_items"]:
            m = moutoun_dict.get(item["matn_id"])
            if not m:
                continue
            b = next((b for b in m["abyat"] if b["index"] == item["bayt_index"]), None)
            if b:
                rev_e.append({**item, "arabic": b["arabic"], "translation_fr": b["translation_fr"],
                             "matn_title_fr": m["title_fr"], "matn_title_ar": m["title_ar"]})
        enriched.append({**day, "new_items": new_e, "review_items": rev_e})
    return enriched


@api_router.get("/programs/{device_id}")
async def list_programs(device_id: str):
    docs = await db.programs.find({"device_id": device_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.post("/programs", response_model=Program)
async def create_program(payload: ProgramCreate):
    if not payload.matn_ids:
        raise HTTPException(status_code=400, detail="Sélectionne au moins un matn")
    if payload.duration_days < 1 or payload.duration_days > 365:
        raise HTTPException(status_code=400, detail="Durée invalide (1 à 365 jours)")
    if payload.daily_new_count < 1 or payload.daily_new_count > 20:
        raise HTTPException(status_code=400, detail="Quantité quotidienne invalide (1 à 20)")

    active_count = await db.programs.count_documents(
        {"device_id": payload.device_id, "status": "active"}
    )
    if active_count >= MAX_ACTIVE_PROGRAMS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_ACTIVE_PROGRAMS} programmes actifs simultanés.")

    today = datetime.now(timezone.utc).date()
    end = today + timedelta(days=payload.duration_days - 1)
    program = Program(
        device_id=payload.device_id,
        name=payload.name,
        matn_ids=payload.matn_ids,
        start_date=today.isoformat(),
        end_date=end.isoformat(),
        duration_days=payload.duration_days,
        daily_new_count=payload.daily_new_count,
        include_review=payload.include_review,
    )
    await db.programs.insert_one(program.model_dump())
    return program


@api_router.delete("/programs/{program_id}")
async def delete_program(program_id: str, device_id: str):
    res = await db.programs.delete_one({"id": program_id, "device_id": device_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Programme introuvable")
    return {"ok": True}


@api_router.patch("/programs/{program_id}")
async def update_program_status(program_id: str, device_id: str, status: str):
    if status not in ("active", "paused", "completed"):
        raise HTTPException(status_code=400, detail="Statut invalide")
    if status == "active":
        active_count = await db.programs.count_documents(
            {"device_id": device_id, "status": "active", "id": {"$ne": program_id}}
        )
        if active_count >= MAX_ACTIVE_PROGRAMS:
            raise HTTPException(status_code=400, detail=f"Maximum {MAX_ACTIVE_PROGRAMS} programmes actifs.")
    res = await db.programs.update_one(
        {"id": program_id, "device_id": device_id},
        {"$set": {"status": status}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Programme introuvable")
    return {"ok": True}


@api_router.get("/programs/detail/{program_id}")
async def get_program_detail(program_id: str):
    program = await db.programs.find_one({"id": program_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Programme introuvable")
    moutoun_list = await db.moutoun.find({"id": {"$in": program["matn_ids"]}}, {"_id": 0}).to_list(50)
    moutoun_dict = {m["id"]: m for m in moutoun_list}
    schedule = _flatten_program_schedule(program, moutoun_dict)
    enriched = await _enrich_schedule_items(schedule, moutoun_dict)

    today = datetime.now(timezone.utc).date()
    start = date.fromisoformat(program["start_date"])
    today_index = (today - start).days
    today_items = enriched[today_index] if 0 <= today_index < len(enriched) else None

    progress = await db.progress.find(
        {"device_id": program["device_id"], "matn_id": {"$in": program["matn_ids"]}},
        {"_id": 0},
    ).to_list(5000)
    learned_keys = {(p["matn_id"], p["bayt_index"]) for p in progress}

    total_new = sum(len(d["new_items"]) for d in enriched)
    learned_in_program = sum(
        1 for d in enriched for it in d["new_items"]
        if (it["matn_id"], it["bayt_index"]) in learned_keys
    )

    return {
        "program": program,
        "moutoun": [{"id": m["id"], "title_fr": m["title_fr"], "title_ar": m["title_ar"]} for m in moutoun_list],
        "schedule": enriched,
        "today_index": today_index,
        "today_items": today_items,
        "progress_percent": round((learned_in_program / total_new) * 100) if total_new else 0,
        "total_new_target": total_new,
        "learned_count": learned_in_program,
    }


@api_router.get("/programs/today/{device_id}")
async def get_today_active_programs(device_id: str):
    """Get today's items for all active programs of a device."""
    programs = await db.programs.find(
        {"device_id": device_id, "status": "active"}, {"_id": 0}
    ).to_list(20)
    if not programs:
        return {"programs": []}

    all_matn_ids = list({mid for p in programs for mid in p["matn_ids"]})
    moutoun_list = await db.moutoun.find({"id": {"$in": all_matn_ids}}, {"_id": 0}).to_list(50)
    moutoun_dict = {m["id"]: m for m in moutoun_list}

    today = datetime.now(timezone.utc).date()
    out = []
    for p in programs:
        start = date.fromisoformat(p["start_date"])
        day_index = (today - start).days
        if day_index < 0 or day_index >= p["duration_days"]:
            continue
        schedule = _flatten_program_schedule(p, moutoun_dict)
        enriched = await _enrich_schedule_items(schedule, moutoun_dict)
        today_items = enriched[day_index] if day_index < len(enriched) else None
        if today_items:
            out.append({
                "program_id": p["id"],
                "program_name": p["name"],
                "day_index": day_index,
                "duration_days": p["duration_days"],
                "today_items": today_items,
            })
    return {"programs": out}


# ============ End Programs ============


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_seed():
    await ensure_preloaded_in_db()
    logger.info("Preloaded moutoun ensured in DB.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
