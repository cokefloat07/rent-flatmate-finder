# Rent & Flatmate Finder

A full-stack platform where owners list rooms and tenants create "looking for room" profiles. An LLM-powered compatibility engine scores and ranks matches, real-time chat opens once interest is accepted, and email notifications fire on key events.

- **Live app:** https://rent-flatmate-finder-rouge.vercel.app/
- **Repo:** https://github.com/cokefloat07/rent-flatmate-finder

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), Tailwind CSS, Zustand, React Hook Form, Socket.IO client |
| Backend | FastAPI (Python), Beanie ODM, PyJWT, python-socketio |
| Database | MongoDB |
| Real-time | Socket.IO (WebSocket) |
| Email | fastapi-mail (SMTP, e.g. Gmail app password) |
| LLM | Groq (OpenAI-compatible) or local Ollama, selectable via `LLM_PROVIDER` |
| Deployment | Vercel (frontend), Render (backend) |

## Features

- Role-based auth (tenant / owner / admin) with JWT
- Owners create/update/delete room listings and mark listings as filled (hidden from search)
- Tenants create/update a "looking for room" profile (preferred location, budget range, move-in date)
- Tenants browse and filter listings by location/budget, ranked by AI compatibility score
- AI compatibility score (0–100 + explanation) computed once per tenant–listing pair and cached in `compatibility_scores`, not recomputed on every request
- If the LLM call fails or returns malformed JSON (after one retry), the system falls back to a deterministic rule-based scorer — scoring never errors out
- Tenant sends interest → owner accepts/declines/revokes; email sent to the owner when a tenant's score is ≥ 80, and to the tenant when the owner responds
- Real-time chat over Socket.IO, scoped per accepted interest (`room:{interest_id}`), messages persisted in MongoDB
- Admin endpoints to list/delete users and listings and view an activity feed

## Project Structure

```
rent-flatmate-finder/
├── client/                 # React + Vite frontend
│   └── src/
├── server/                 # FastAPI backend
│   ├── app/
│   │   ├── api/routers/    # auth, listings, profiles, interests, chat, admin
│   │   ├── core/           # config, security (JWT)
│   │   ├── db/             # MongoDB connection (Beanie)
│   │   ├── models/         # User, Listing, TenantProfile, Interest, Message, CompatibilityScore
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # llm_service.py, email_service.py
│   │   ├── sockets/        # chat_socket.py (Socket.IO events)
│   │   └── utils/          # build_prompt.py, rule_based_score.py, hashing, logger
│   ├── docs/                # API_DOCS.md, DB_SCHEMA.md, SYSTEM_DESIGN.md
│   └── tests/
└── render.yaml
```

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- A MongoDB connection string (local or Atlas)
- A Groq API key (free tier) **or** a local Ollama instance

### Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in the values below
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000
```

API docs (Swagger) are then available at `http://localhost:8000/docs`.

### Frontend

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

### `server/.env`

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=rent_flatmate_finder

# JWT
SECRET_KEY=change-me-in-production-use-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# LLM (choose one provider)
LLM_PROVIDER=groq                     # "groq" or "ollama"
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
LLM_BASE_URL=http://localhost:11434   # only used when LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b                 # only used when LLM_PROVIDER=ollama

# Email (SMTP)
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@rentflatmate.local
MAIL_FROM_NAME=Rent & Flatmate Finder
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False

# CORS
CLIENT_URL=http://localhost:5173
```

### `client/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

## Deployment

**Frontend — Vercel**
- New project from this repo, root directory `client`
- Env var: `VITE_API_BASE_URL=https://<your-render-app>.onrender.com/api`

**Backend — Render**
- New Web Service from this repo, root directory `server`
- Start command: `uvicorn app.main:socket_app --host 0.0.0.0 --port $PORT`
- Env vars: `MONGO_URI`, `SECRET_KEY`, `CLIENT_URL`, `LLM_PROVIDER`, `GROQ_API_KEY` (or `LLM_BASE_URL`/`LLM_MODEL` for Ollama), `MAIL_*`

## API Overview

Full endpoint list in [`server/docs/API_DOCS.md`](server/docs/API_DOCS.md). Highlights:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (tenant/owner) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/listings/` | Create listing (owner) |
| GET | `/api/listings/` | Browse/filter listings (ranked by score for tenants) |
| PATCH | `/api/listings/{id}/filled` | Toggle filled status |
| POST | `/api/profiles/` | Create tenant profile |
| POST | `/api/interests/` | Express interest (triggers scoring + optional owner email) |
| PATCH | `/api/interests/{id}/respond` | Owner accepts/declines |
| PATCH | `/api/interests/{id}/revoke` | Owner revokes an accepted interest |
| GET | `/api/chat/{interest_id}/messages` | Chat history for an accepted interest |
| GET/DELETE | `/api/admin/users`, `/api/admin/listings` | Admin management |
| GET | `/api/admin/activity` | Platform activity feed |

### Socket.IO events

| Event | Direction | Payload |
|---|---|---|
| `connect` | client → server | `auth: { token }` (JWT) |
| `join_room` | client → server | `{ interest_id }` |
| `send_message` | client → server | `{ interest_id, content }` |
| `new_message` | server → room `room:{interest_id}` | persisted message |
| `error` | server → client | `{ message }` |

## LLM Compatibility Scoring

Prompt template (built in `app/utils/build_prompt.py`):

```
You are a rental compatibility scorer. Analyze the match between a tenant
profile and a room listing.

TENANT PROFILE:
{ preferred_location, budget_min, budget_max, move_in_date }

ROOM LISTING:
{ location, rent, available_from, room_type, furnishing_status }

Scoring rubric (total 100 points):
- Location match: 50 points (exact or partial match)
- Budget fit: 50 points (rent within budget_min and budget_max)
- Deduct points for mismatches with brief explanation

Respond with ONLY valid JSON in this exact format (no markdown, no code fences):
{"score": <number 0-100>, "explanation": "<one-sentence explanation>"}
```

Example output:
```json
{ "score": 87.5, "explanation": "Great location match in Koramangala; rent is within your budget range." }
```

**Fallback:** if the LLM call errors, times out, or returns malformed JSON twice in a row, `rule_based_score()` computes the same 0–100 score deterministically (50 pts location overlap + 50 pts budget fit, with graduated penalties for rent over budget). The response always includes a `method` field (`llm-groq`, `llm-ollama`, or `rule-based`) so the source of a score is traceable. The result is cached in the `compatibility_scores` collection per tenant–listing pair.

## Testing

```bash
cd server
pytest
```

Covers auth, interest flow, and scoring (`tests/test_auth.py`, `test_interests.py`, `test_scoring.py`).

## Documentation

- [`server/docs/API_DOCS.md`](server/docs/API_DOCS.md) — full endpoint reference
- [`server/docs/DB_SCHEMA.md`](server/docs/DB_SCHEMA.md) — MongoDB collections and indexes
- [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) — architecture write-up
