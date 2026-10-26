import { useEffect, useState } from "react";

// These are UI feedback only — the frontend cannot know exactly which
// backend step is running, so this is a friendly generic sequence rather
// than a claim of real-time progress.
const STEPS = [
  "Reading your notes…",
  "Cleaning the text…",
  "Generating your summary…",
  "Building your flowchart…",
];

export default function ProcessingState() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="processing-state" role="status" aria-live="polite">
      <div className="processing-spinner" aria-hidden="true" />
      <p className="processing-message">{STEPS[stepIndex]}</p>
      <div className="processing-steps">
        {STEPS.map((step, i) => (
          <span
            key={step}
            className={`processing-dot ${i === stepIndex ? "active" : ""} ${i < stepIndex ? "done" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
