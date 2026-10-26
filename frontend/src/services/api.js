// Central place for every call to the NoteFlow backend.
// Nothing outside this file should call fetch() directly.

const API_URL = (
  import.meta.env.VITE_API_URL || "https://note-summarizer-seven.vercel.app"
).replace(/\/+$/, "");

const CONNECTION_ERROR =
  "Unable to connect to the server. Make sure the backend is running.";

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch (err) {
    throw new Error(CONNECTION_ERROR);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // Response had no JSON body (e.g. a proxy error page).
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      "We couldn't process this PDF. Please try again.";
    throw new Error(message);
  }

  return data ?? {};
}

/** Uploads a PDF file and returns the created note (summary + flowchart). */
export async function uploadNote(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/notes/upload", {
    method: "POST",
    body: formData,
  });
}

/** Fetches the list of previously processed notes. */
export async function getNotes() {
  const data = await request("/api/notes", { method: "GET" });
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.notes)) return data.notes;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

/** Fetches a single note by id, including its summary and flowchart. */
export async function getNote(id) {
  const data = await request(`/api/notes/${id}`, { method: "GET" });
  return data.note || data.data || data;
}

/** Deletes a note by id. */
export async function deleteNote(id) {
  return request(`/api/notes/${id}`, { method: "DELETE" });
}
