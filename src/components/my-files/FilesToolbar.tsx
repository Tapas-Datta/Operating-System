type Props = {
  canGoBack: boolean;
  search: string;
  onSearch: (value: string) => void;
  onBack: () => void;
  onRefresh: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  sortBy: "name" | "size" | "modified";
  onSortChange: (value: "name" | "size" | "modified") => void;
};

export default function FilesToolbar(props: Props) {
  return (
    <div className="myfiles-toolbar">
      <div className="myfiles-navigation">
        <button onClick={props.onBack} disabled={!props.canGoBack} title="Go back">←</button>
        <button onClick={props.onRefresh} title="Refresh">↻</button>
      </div>
      <div className="myfiles-search">
        <span>⌕</span>
        <input
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
          placeholder="Search files..."
        />
      </div>
      <select
        aria-label="Sort files"
        value={props.sortBy}
        onChange={(e) => props.onSortChange(e.target.value as "name" | "size" | "modified")}
        className="myfiles-sort"
      >
        <option value="name">Sort: Name</option>
        <option value="size">Sort: Size</option>
        <option value="modified">Sort: Date Modified</option>
      </select>
      <button className="myfiles-new-folder" onClick={props.onNewFile}>+ New File</button>
      <button className="myfiles-new-folder" onClick={props.onNewFolder}>+ New Folder</button>
    </div>
  );
}
