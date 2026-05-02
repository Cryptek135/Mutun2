# Moutoun — Product Requirements (PRD)

## Original Problem Statement
> "salut jai remarque qu'il existe des sites applications pour s'organiser pour la révision du coran mais pas pour les révisions apprentissage des mutun talib 3ilm. J'aimerais en faire un tu peux m'aider stp"

## User Choices (locked)
- No authentication — local mode (device_id stored in localStorage)
- French UI, Arabic matn with French translations
- Text zoom (+/−)
- AI assistant (Claude Sonnet 4.5 via Emergent LLM key) — explanation, revision questions
- Tamrin mode every 5 days = full review of all learned content
- Audio: browser Web Speech API (TTS) with explicit "lecture automatique" disclaimer
- Sober graphite/ink palette (terracotta retired in favor of warm charcoal)
- Custom programs/calendar — up to 5 active in parallel
- Matn content must be complete WITH proofs (Quran/Sunnah daleel)

## User Personas
- **Talib al-'ilm**: student of Islamic knowledge memorizing classical matn
- **Self-learner**: French-speaking Muslim wanting structure & accountability

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB), pydantic models, Emergent LLM key for Claude Sonnet 4.5
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn/UI, Lucide icons, Cormorant Garamond + Manrope + Amiri fonts
- **Database**: MongoDB collections: `moutoun`, `progress`, `device_stats`, `programs`, `ai_chat_history`
- **No auth**: device_id (UUID) per browser, persisted in localStorage

## Implemented Features (as of Feb 2026)
### v1 — Initial MVP
- 5 preloaded matn (basic content)
- Dashboard, Library, Reader (zoom + Arabic TTS + AI chat), Tamrin, Stats, Add custom matn
- SRS review (1d/3d/7d/14d/30d)
- Streaks, per-matn progress

### v1.1 — Iteration (current)
- **Expanded matn content** with proofs:
  - Ousoul Thalatha: 31 sections (vs 9)
  - Qawa'id Al-Arba'a: 17 sections (vs 5)
  - Nawaqid Al-Islam: 14 sections (with daleel)
  - Arba'in Nawawi: **42 hadiths complete** (vs 8)
  - Ajroumiyya: 20 sections (i'rab + signs)
- **3 new moutoun added**: Sittah Ousoul (15), 'Umdat al-Ahkâm Kitâb at-Tahâra (13), Adhkâr wa Adâb (18)
- **Sober color palette**: graphite/ink replaces terracotta
- **Programs/Calendar feature**: create up to 5 personalized programs in parallel — pick moutoun, duration, daily pace; auto-generated schedule with new + review items, day-by-day calendar view
- **Audio disclaimer**: clearly states it's automated TTS, not real Qari recitation

## API (all under /api)
- Moutoun: GET/POST/DELETE/GET-by-id
- Progress: GET, POST (action: learn/review_good/review_hard/reset)
- Plan: GET /plan/{device_id} (cycle_day, is_tamrin_day, due_reviews, new_suggestions, tamrin_items)
- Stats: GET /stats/{device_id}
- AI Chat: POST /ai/chat (modes: explain, questions, free)
- **Programs**: GET (list), POST (create), GET /detail/{id}, PATCH (status), DELETE, GET /today/{device_id}

## Backlog / P1
- Audio: integrate ElevenLabs (real Arabic recitation) when user provides API key
- Auto-mark programs as 'completed' when end_date reached
- Validate program matn_ids against DB on creation
- Sharing: export progress/program as PDF or share link

## Backlog / P2
- Quranic recitation from external API per ayah cited in matn
- Multi-language UI (English, Arabic interface)
- Group programs (study with friends)
- Quiz mode with AI-generated MCQs

## Test Status
- iteration_1: 14/14 backend ✅
- iteration_2: 22/22 backend ✅ (Programs + new matn + 42 hadiths)


### v1.2 — Iteration 3 (current)
- **Édition des moutoun** : PUT /api/moutoun/{id} permet de corriger même les moutoun préchargés (traductions, ajout de passages, réorganisation)
- **seed_version logic** : les éditions utilisateur sont marquées seed_version=9999 et préservées de tout futur upsert
- **Page /matn/:id/modifier** : éditeur complet avec ajout/suppression/réorganisation de passages
- **Audio loop** : 1× / 3× / 5× / ∞ — l'utilisateur peut écouter en boucle un passage difficile
- **Modes auto-test** dans la barre flottante :
  - Normal (affiché)
  - Premier mot — seul le premier mot de chaque bayt est affiché (le reste = points)
  - Texte à trous — masque un mot sur trois pour auto-évaluation
  - Masqué — flou complet (mode test classique)
- **Murâja'a globale** : bouton "lecture en chaîne" qui joue séquentiellement tous les abyât du matn (pour réviser cumulativement)
- **31/32 backend tests pass** (1 minor spec deviation now fixed in iteration follow-up)


### v1.3 — Iteration 4 (current)
- **Structure hiérarchique des matn** : chaque passage (bayt) peut désormais avoir des champs optionnels `section` et `chapter`
- **Affichage groupé** : le lecteur regroupe visuellement les abyât par section > chapitre avec en-têtes
- **Exemple appliqué** : Adhkâr wa Adab → 2 sections (Les Invocations, Les Convenances) × 8 chapitres (matin, soir, sommeil, voyage, toilettes, repas, maison, mosquée)
- **Édition** : pages Ajouter et Modifier incluent 2 inputs par passage (Section, Chapitre) + propagation automatique de la section/chapitre précédent quand on ajoute un nouveau passage
- **43/43 tests backend** ✅

