import { useEffect, useState } from "react";

const STORAGE_KEY = "tapas-notes-content";

export default function Notes() {
  const [content, setContent] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, content);
        setSaved(true);
      } catch (error) {
        console.error("Unable to save notes:", error);
        setSaved(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [content]);

  return (
    <section className="tap-mini-app tap-notes">
      <div className="tap-mini-heading"><div><h2>Notes</h2><p>Your notes are saved on this device.</p></div><span>{saved ? "Saved" : "Not saved"}</span></div>
      <textarea value={content} onChange={(event) => { setContent(event.target.value); setSaved(false); }} placeholder="Start writing..." aria-label="Note content" />
    </section>
  );
}
