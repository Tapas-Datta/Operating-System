import type { FileEntry } from "../../types/file";

export type StorageInfo = {
  total: number;
  available: number;
  used: number;
};

type Props = {
  currentPath: string;
  activeView: string;
  category: string;
  favorites: string[];
  recent: FileEntry[];
  storage: StorageInfo | null;
  trashCount: number;
  storageLabel?: string;
  onNavigate: (path: string) => void;
  onViewChange: (view: string, category?: string) => void;
};

const locations = [
  { name: "Home", path: "", icon: "⌂" },
  { name: "Desktop", path: "Desktop", icon: "🖥️" },
  { name: "Documents", path: "Documents", icon: "📄" },
  { name: "Downloads", path: "Downloads", icon: "⬇️" },
  { name: "Pictures", path: "Pictures", icon: "🖼️" },
  { name: "Music", path: "Music", icon: "🎵" },
  { name: "Videos", path: "Movies", icon: "🎬" },
];

const categories = [
  { name: "Documents", key: "documents", icon: "📄" },
  { name: "Images", key: "images", icon: "🖼️" },
  { name: "Videos", key: "videos", icon: "🎬" },
  { name: "Audio", key: "audio", icon: "🎵" },
  { name: "Others", key: "others", icon: "📦" },
];

function formatBytes(value: number) {
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  return `${(value / 1024 ** 2).toFixed(0)} MB`;
}

export default function FilesSidebar(props: Props) {
  const usedPercent = props.storage && props.storage.total > 0
    ? Math.min(100, (props.storage.used / props.storage.total) * 100)
    : 0;

  return (
    <aside className="myfiles-sidebar">
      <div className="myfiles-brand">
        <span className="myfiles-brand-icon">📁</span>
        <div><strong>My Files</strong><small>File Manager</small></div>
      </div>

      <p className="myfiles-section-label">QUICK ACCESS</p>
      {locations.map((item) => (
        <button
          key={item.name}
          className={`myfiles-nav-item ${props.activeView === "folder" && props.currentPath === item.path ? "active" : ""}`}
          onClick={() => props.onNavigate(item.path)}
        >
          <span>{item.icon}</span>{item.name}
        </button>
      ))}

      <p className="myfiles-section-label">PERSONAL</p>
      <button className={`myfiles-nav-item ${props.activeView === "favorites" ? "active" : ""}`} onClick={() => props.onViewChange("favorites")}>
        <span>⭐</span>Favorites <small>{props.favorites.length}</small>
      </button>
      <button className={`myfiles-nav-item ${props.activeView === "recent" ? "active" : ""}`} onClick={() => props.onViewChange("recent")}>
        <span>🕘</span>Recent Files <small>{props.recent.length}</small>
      </button>
      <button className={`myfiles-nav-item ${props.activeView === "trash" ? "active" : ""}`} onClick={() => props.onViewChange("trash")}>
        <span>🗑️</span>Recycle Bin <small>{props.trashCount}</small>
      </button>

      <p className="myfiles-section-label">FILE CATEGORIES</p>
      {categories.map((item) => (
        <button
          key={item.key}
          className={`myfiles-nav-item ${props.activeView === "category" && props.category === item.key ? "active" : ""}`}
          onClick={() => props.onViewChange("category", item.key)}
        >
          <span>{item.icon}</span>{item.name}
        </button>
      ))}

      <div className="myfiles-storage">
        <p className="myfiles-section-label">STORAGE</p>
        {props.storage ? (
          <>
            <div className="myfiles-storage-bar"><span style={{ width: `${usedPercent}%` }} /></div>
            <small>{formatBytes(props.storage.used)} used</small>
            <small>{formatBytes(props.storage.available)} available</small>
          </>
        ) : <small>Storage information unavailable</small>}
      </div>

      <div className="myfiles-sidebar-footer">
        <span className="myfiles-status-dot" />{props.storageLabel ?? "Home directory access"}
      </div>
    </aside>
  );
}
