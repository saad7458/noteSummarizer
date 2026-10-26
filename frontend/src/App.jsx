import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import UploadArea from "./components/UploadArea.jsx";
import ProcessingState from "./components/ProcessingState.jsx";
import Summary from "./components/Summary.jsx";
import Flowchart from "./components/Flowchart.jsx";
import NotesList from "./components/NotesList.jsx";
import EmptyState from "./components/EmptyState.jsx";
import Toast from "./components/Toast.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import { uploadNote, getNotes, getNote, deleteNote } from "./services/api.js";

export default function App() {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute("data-theme") || "light";
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("noteflow-theme", next);
      } catch (e) {}
      return next;
    });
  }, []);

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedNote, setSelectedNote] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const resultsRef = useRef(null);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const list = await getNotes();
      setNotes(list);
    } catch (err) {
      // A failed background refresh shouldn't block the rest of the app.
      console.error(err);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  function handleFileSelect(selected) {
    setUploadError("");
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF file.");
      return;
    }
    setFile(selected);
  }

  function handleFileClear() {
    setFile(null);
    setUploadError("");
  }

  async function handleGenerate() {
    if (!file) {
      setUploadError("Please select a PDF first.");
      return;
    }
    setUploadError("");
    setIsProcessing(true);
    setSelectedNote(null);

    try {
      const result = await uploadNote(file);
      setSelectedNote({
        id: result.noteId || result.id || result._id,
        filename: file.name,
        summary: result.summary,
        flowchart: result.flowchart,
        status: "completed",
      });
      setFile(null);
      loadNotes();
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setUploadError(err.message || "We couldn't process this PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSelectNote(id) {
    setNoteLoading(true);
    setUploadError("");
    try {
      const note = await getNote(id);
      setSelectedNote({
        id: note.id || note._id || id,
        filename: note.filename || note.originalName || note.name,
        summary: note.summary,
        flowchart: note.flowchart,
        status: note.status || "completed",
      });
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setToast({ message: err.message || "Couldn't load that note.", type: "error" });
    } finally {
      setNoteLoading(false);
    }
  }

  async function confirmDelete() {
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => (n.id || n._id) !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
      setToast({ message: "Note deleted.", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Couldn't delete that note.", type: "error" });
    }
  }

  const selectedNoteId = selectedNote?.id;
  const deleteTargetNote = notes.find((n) => (n.id || n._id) === deleteTarget);

  return (
    <div className="app-shell">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <div className="app-body">
        <NotesList
          notes={notes}
          isLoading={notesLoading}
          selectedId={selectedNoteId}
          onSelect={handleSelectNote}
          onDeleteRequest={setDeleteTarget}
        />

        <main className="main-content">
          <div className="hero">
            <div className="hero-badge">
              <span className="badge-sparkle">✨</span> Powered by Gemini AI
            </div>
            <h1>
              Turn your PDF into a <span className="marker-underline">clear study guide</span>
            </h1>
            <p>Upload your notes to automatically generate structured summaries and interactive visual flowcharts.</p>
          </div>

          <UploadArea
            file={file}
            onFileSelect={handleFileSelect}
            onFileClear={handleFileClear}
            onGenerate={handleGenerate}
            isProcessing={isProcessing}
            error={uploadError}
          />

          {isProcessing && <ProcessingState />}

          {!isProcessing && noteLoading && (
            <div className="processing-state">
              <div className="processing-spinner" aria-hidden="true" />
              <p className="processing-message">Loading note…</p>
            </div>
          )}

          {!isProcessing && !noteLoading && selectedNote && (
            <div className="results" ref={resultsRef}>
              <Summary summary={selectedNote.summary} />
              <Flowchart flowchart={selectedNote.flowchart} />
            </div>
          )}

          {!isProcessing && !noteLoading && !selectedNote && !notesLoading && notes.length === 0 && (
            <EmptyState />
          )}
        </main>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this note?"
          message={`"${deleteTargetNote ? (deleteTargetNote.filename || deleteTargetNote.originalName || deleteTargetNote.name) : "This note"}" will be permanently removed.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
    </div>
  );
}
