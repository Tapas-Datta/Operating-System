import type { FileEntry } from "../../types/file";
import { formatSize } from "../../utils/fileUtils";

type Props = {
  entry: FileEntry;
  selected: boolean;
  viewMode: "list" | "grid";
  onSelect: (event: React.MouseEvent<HTMLDivElement>) => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
};

export default function FileRow(props: Props) {
  const { entry } = props;

  return (
    <div
      className={`myfiles-row ${props.viewMode === "grid" ? "myfiles-grid-card" : ""} ${props.selected ? "selected" : ""}`}
      onClick={props.onSelect}
      onDoubleClick={props.onOpen}
      onContextMenu={props.onContextMenu}
      draggable
      onDragStart={props.onDragStart}
      onDragOver={(event) => { if (entry.isDir) event.preventDefault(); }}
      onDrop={props.onDrop}
      title={entry.name}
    >
      <div className="myfiles-name">
        <span className="myfiles-file-icon">{entry.isDir ? "📁" : "📄"}</span>
        <span>{entry.name}</span>
      </div>
      <span className="myfiles-type">{entry.isDir ? "Folder" : "File"}</span>
      <span className="myfiles-size">{entry.isDir ? "—" : formatSize(entry.size)}</span>
      <div className="myfiles-actions">
        <button title="Rename" onClick={(e) => { e.stopPropagation(); props.onRename(); }}>✎</button>
        <button title="Delete to Recycle Bin" className="myfiles-delete" onClick={(e) => { e.stopPropagation(); props.onDelete(); }}>×</button>
      </div>
    </div>
  );
}
