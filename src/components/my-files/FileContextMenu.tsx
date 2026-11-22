import type { FileEntry } from "../../types/file";

type Props = {
  entry: FileEntry;
  x: number;
  y: number;
  isFavorite: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyName: () => void;
  onInfo: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
};

export default function FileContextMenu({
  entry, x, y, isFavorite, onOpen, onRename, onDelete,
  onCopyName, onInfo, onToggleFavorite, onClose
}: Props) {
  return (
    <>
      <div className="myfiles-context-backdrop" onMouseDown={onClose} />
      <div
        className="myfiles-context-menu"
        style={{ left: Math.max(4, x), top: Math.max(4, y) }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="myfiles-context-title">{entry.name}</div>
        <button onClick={onOpen}>Open</button>
        <button onClick={onRename}>Rename</button>
        <button onClick={onCopyName}>Copy File Name</button>
        <button onClick={onToggleFavorite}>
          {isFavorite ? "★ Remove from Favorites" : "☆ Add to Favorites"}
        </button>
        <button onClick={onInfo}>File Information</button>
        <div className="myfiles-context-divider" />
        <button className="myfiles-context-danger" onClick={onDelete}>Delete</button>
      </div>
    </>
  );
}
