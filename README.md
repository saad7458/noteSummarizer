# NoteFlow 📚✨

> Turn your PDF notes into structured study summaries and interactive visual flowcharts powered by Google Gemini AI and MongoDB Atlas.

---

## Features

- **PDF Text Extraction & Cleaning**: Upload PDF study material (up to 15MB) and clean noisy header/footer artifacts automatically.
- **Gemini AI Analysis**: Automatically extracts core concepts, definitions, and relationships using `gemini-3.6-flash`.
- **Interactive Concept Flowchart**: Interactive ReactFlow diagram with color-coded hierarchy levels, zoom/pan navigation, and connector arrows.
- **Study Summary**: Formatted markdown summary with key takeaways and definitions.
- **Dark / Light Mode**: Seamless theme switcher with persistent storage and system preference support.
- **Note Management**: Save, view, and delete previous study guides.

---

## Tech Stack

- **Frontend**: React 18, Vite, ReactFlow, ReactMarkdown, remark-gfm
- **Backend**: Node.js, Express, Multer, pdf-parse, @google/genai SDK
- **Database**: MongoDB Atlas (Mongoose)

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- A [Google Gemini API Key](https://aistudio.google.com/)

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in `backend/` based on `.env.example`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_api_key
```
Start the backend server:
```bash
npm start
```
The backend will run on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

---

## License
MIT
