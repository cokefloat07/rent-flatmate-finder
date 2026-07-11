# Rent & Flatmate Finder

A full-stack app with a Vite React frontend and a FastAPI backend.

## Local development

### Frontend
```bash
cd client
npm install
npm run dev
```

### Backend
```bash
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000
```

## Deployment

### Vercel (frontend)
- Create a Vercel project from this repository.
- Set the root directory to `client`.
- Add environment variable:
  - `VITE_API_BASE_URL=https://<your-render-app>.onrender.com/api`

### Render (backend)
- Create a new Web Service from this repository.
- Set the root directory to `server`.
- Use the start command:
  - `uvicorn app.main:socket_app --host 0.0.0.0 --port $PORT`
- Add environment variables:
  - `MONGO_URI=<your-mongodb-uri>`
  - `SECRET_KEY=<strong-secret>`
  - `CLIENT_URL=https://<your-vercel-app>.vercel.app`
  - `LLM_BASE_URL=<your-llm-endpoint>`
  - `LLM_MODEL=<your-model>`
