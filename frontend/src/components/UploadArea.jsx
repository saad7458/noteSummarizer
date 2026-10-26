import { useRef, useState } from "react";

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadArea({ file, onFileSelect, onFileClear, onGenerate, isProcessing, error }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFileSelect(dropped);
  }

  function handleInputChange(e) {
    const chosen = e.target.files?.[0];
    if (chosen) onFileSelect(chosen);
    e.target.value = "";
  }

  return (
    <div>
      <div
        className={`upload-area ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          style={{ display: "none" }}
          aria-label="Choose a PDF file"
        />

        {!file ? (
          <>
            <div className="upload-icon-circle">
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 15V4M12 4L7.5 8.5M12 4l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Drag &amp; drop your PDF here</h3>
            <p className="upload-hint">or choose a file from your computer (up to 15MB)</p>
            <button type="button" className="browse-btn" onClick={() => inputRef.current?.click()}>
              Choose PDF
            </button>
          </>
        ) : (
          <div className="file-chip">
            <svg className="file-chip-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <div className="file-chip-text">
              <div className="file-chip-name">{file.name}</div>
              <div className="file-chip-size">{formatFileSize(file.size)}</div>
            </div>
            <button
              type="button"
              className="file-chip-remove"
              onClick={onFileClear}
              aria-label="Remove selected file"
              disabled={isProcessing}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ textAlign: "center" }}>
          <p className="field-error" role="alert">{error}</p>
        </div>
      )}

      <div className="upload-actions">
        <button type="button" className="primary-btn" onClick={onGenerate} disabled={isProcessing}>
          {isProcessing ? "Working on it…" : "Generate Summary"}
        </button>
      </div>
    </div>
  );
}
