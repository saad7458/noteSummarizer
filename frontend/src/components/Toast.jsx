import { useEffect } from "react";

export default function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast ${type}`} role="status">
      {message}
    </div>
  );
}
