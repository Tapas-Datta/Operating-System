import { useEffect, useState } from "react";
import type { FileDialogState } from "../../types/file";

type Props = {
  dialog: FileDialogState;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void>;
};

export default function FileDialog({ dialog, onClose, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(dialog?.mode === "rename" ? dialog.entry?.name ?? "" : "");
    setError("");
  }, [dialog]);

  if (!dialog) return null;

  const isDelete = dialog.mode === "delete";
  const titles = {
    file: "Create new file",
    folder: "Create new folder",
    rename: "Rename item",
    delete: "Move to Recycle Bin",
  };

  const submit = async () => {
    if (!isDelete && !value.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    if (!isDelete && (value.includes("/") || value.includes("\\"))) {
      setError("Name cannot contain / or \\.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(value.trim());
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="myfiles-dialog-backdrop" onMouseDown={(e) => {
      if (e.target === e.currentTarget && !busy) onClose();
    }}>
      <div className="myfiles-dialog" role="dialog" aria-modal="true">
        <h3>{titles[dialog.mode]}</h3>
        {isDelete ? (
          <p>Move "{dialog.entry?.name}" to the Recycle Bin?</p>
        ) : (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dialog.mode === "file" ? "example: notes.txt" : "Enter name"}
            onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          />
        )}
        {error && <p className="myfiles-dialog-error">{error}</p>}
        <div className="myfiles-dialog-actions">
          <button onClick={onClose} disabled={busy}>Cancel</button>
          <button className={isDelete ? "myfiles-dialog-danger" : ""} onClick={() => void submit()} disabled={busy}>
            {busy ? "Please wait..." : isDelete ? "Move to Bin" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
