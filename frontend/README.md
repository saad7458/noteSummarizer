# NoteFlow — Frontend

A React + Vite frontend for the PDF Note Summarizer. Upload a PDF, and it's sent
to your existing backend (`http://localhost:5000` by default), which extracts
the text, summarizes it with Gemini, and returns a summary plus a flowchart.
This app renders whatever the backend returns — nothing here is mocked or
hardcoded.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173`. Make sure the backend is running at
the URL set in `.env` (`VITE_API_URL`, defaults to `http://localhost:5000`).

## What's in here

- `src/services/api.js` — every backend call lives here (`uploadNote`,
  `getNotes`, `getNote`, `deleteNote`).
- `src/components/` — one component per piece of UI (upload area, processing
  state, summary, flowchart, notes sidebar, empty state, toast, delete dialog).
- `src/components/Flowchart.jsx` — converts the backend's `{ nodes, edges }`
  into React Flow's format and lays it out automatically (the backend doesn't
  send positions, so this computes a left-to-right layered layout from the
  edge structure).

## Notes

- No authentication, no mock data, no local database — this is a thin client
  over your existing four endpoints.
- CORS must be enabled on the backend for `http://localhost:5173`.
