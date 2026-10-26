export default function EmptyState() {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M9 13h6M9 16h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <h3>No notes yet</h3>
      <p>Upload your first PDF to generate a summary and flowchart.</p>
    </div>
  );
}
