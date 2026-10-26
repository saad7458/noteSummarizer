function getName(note) {
  return note.filename || note.originalName || note.name || "Untitled note";
}

function getDate(note) {
  const raw = note.createdAt || note.uploadedAt || note.date;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotesList({ notes, isLoading, selectedId, onSelect, onDeleteRequest }) {
  return (
    <aside className="sidebar">
      <p className="sidebar-heading">Recent Notes</p>

      {isLoading && <p className="sidebar-loading">Loading…</p>}

      {!isLoading && notes.length === 0 && (
        <p className="sidebar-empty">
          Nothing here yet. Notes you process will show up in this list.
        </p>
      )}

      {!isLoading && notes.length > 0 && (
        <ul className="notes-list">
          {notes.map((note) => {
            const id = note.id || note._id;
            const status = note.status;
            return (
              <li key={id} className={`note-item ${selectedId === id ? "active" : ""}`}>
                <button
                  type="button"
                  className="note-item-text"
                  onClick={() => onSelect(id)}
                >
                  <div className="note-item-name">{getName(note)}</div>
                  <div className="note-item-date">{getDate(note)}</div>
                  {status && status !== "completed" && (
                    <span className={`note-status ${status}`}>{status}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="note-delete-btn"
                  onClick={() => onDeleteRequest(id)}
                  aria-label={`Delete ${getName(note)}`}
                  title="Delete note"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
