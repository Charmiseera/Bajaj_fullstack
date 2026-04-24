# BFHL — SRM Full Stack Engineering Challenge

## Project Structure

```
bajaj/
├── backend/          # Express.js REST API
│   ├── server.js
│   ├── routes/bfhl.js
│   ├── lib/processor.js
│   └── package.json
└── frontend/         # Vanilla HTML/CSS/JS frontend
    ├── index.html
    ├── style.css
    └── app.js
```

## API

### `POST /bfhl`

**Request:**
```json
{ "data": ["A->B", "A->C", "B->D"] }
```

**Response:** Returns hierarchies, invalid entries, duplicate edges, and a summary.

## Running Locally

### Backend
```bash
cd backend
npm install
npm start
# API runs at http://localhost:3000
```

### Frontend
Open `frontend/index.html` in a browser, or serve with:
```bash
npx serve frontend
```

> **Note:** Update `API_BASE_URL` in `frontend/app.js` to point to your deployed backend URL before deploying the frontend.

## Deployment

- **Backend:** Deploy `backend/` to [Render](https://render.com) — set Start Command to `node server.js`
- **Frontend:** Deploy `frontend/` to [Netlify](https://netlify.com) — drag & drop the folder

## Features

- Validates node format (`X->Y`, single uppercase letters, no self-loops)
- Deduplicates edges (first occurrence wins)
- Diamond/multi-parent handling (first-encountered parent wins)
- Cycle detection (DFS-based)
- Nested tree construction with depth calculation
- Summary with largest tree root (depth + lex tiebreaker)
- CORS enabled
- Premium dark glassmorphism UI
