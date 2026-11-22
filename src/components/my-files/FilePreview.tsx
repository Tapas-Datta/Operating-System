import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Props = {
  path: string;
  name: string;
  onClose: () => void;
};

export default function FilePreview({ path, name, onClose }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    invoke<string>("read_file", { path })
      .then((result) => {
        if (active) setContent(result);
      })
      .catch((err) => {
        if (active) setError(String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path]);

  return (
    <div className="myfiles-preview-backdrop" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <section className="myfiles-preview" role="dialog" aria-modal="true">
        <header className="myfiles-preview-header">
          <div>
            <strong>📄 {name}</strong>
            <small>File Preview · Read only</small>
          </div>
          <button onClick={onClose} aria-label="Close preview">×</button>
        </header>

        <main className="myfiles-preview-content">
          {loading ? (
            <p>Loading preview...</p>
          ) : error ? (
            <p className="myfiles-dialog-error">{error}</p>
          ) : (
            <pre>{content || "This file is empty."}</pre>
          )}
        </main>

        <footer className="myfiles-preview-footer">
          <span>Read-only preview</span>
          <button onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}
