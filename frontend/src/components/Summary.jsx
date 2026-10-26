import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Summary({ summary }) {
  return (
    <div className="card summary-card">
      <h2 className="section-heading">
        <span className="marker-underline">Summary</span>
      </h2>
      <div className="summary-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary || ""}</ReactMarkdown>
      </div>
    </div>
  );
}
