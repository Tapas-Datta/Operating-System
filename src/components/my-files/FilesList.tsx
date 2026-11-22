import type { FileEntry } from "../../types/file";
import FileRow from "./FileRow";

type Props = {
  entries: FileEntry[];
  loading: boolean;
  error: string;
  search: string;
  selected: string[];
  viewMode: "list" | "grid";
  onSelect: (entry: FileEntry, event: React.MouseEvent<HTMLDivElement>) => void;
  onOpen: (entry: FileEntry) => void;
  onRename: (entry: FileEntry) => void;
  onDelete: (entry: FileEntry) => void;
  onContextMenu: (entry: FileEntry, event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart: (entry: FileEntry, event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (entry: FileEntry, event: React.DragEvent<HTMLDivElement>) => void;
  onRetry: () => void;
};

export default function FilesList(props: Props) {
  return (
    <>
      {props.viewMode === "list" && (
        <div className="myfiles-list-header">
          <span>Name</span><span>Type</span><span>Size</span><span>Actions</span>
        </div>
      )}
      <div className={`myfiles-list ${props.viewMode === "grid" ? "myfiles-grid" : ""}`}>
        {props.loading ? (
          <div className="myfiles-message">Loading files...</div>
        ) : props.error ? (
          <div className="myfiles-message myfiles-error">
            {props.error}<button onClick={props.onRetry}>Try again</button>
          </div>
        ) : props.entries.length === 0 ? (
          <div className="myfiles-message">
            {props.search ? "No matching files found." : "This folder is empty."}
          </div>
        ) : props.entries.map((entry) => (
          <FileRow
            key={entry.path}
            entry={entry}
            selected={props.selected.includes(entry.path)}
            viewMode={props.viewMode}
            onSelect={(event) => props.onSelect(entry, event)}
            onOpen={() => props.onOpen(entry)}
            onRename={() => props.onRename(entry)}
            onDelete={() => props.onDelete(entry)}
            onContextMenu={(event) => props.onContextMenu(entry, event)}
            onDragStart={(event) => props.onDragStart(entry, event)}
            onDrop={(event) => props.onDrop(entry, event)}
          />
        ))}
      </div>
    </>
  );
}
