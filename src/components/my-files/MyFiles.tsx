import { useMemo, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFiles } from "../../hooks/useFiles";
import type { FileDialogState, FileEntry } from "../../types/file";
import FilesSidebar, { type StorageInfo } from "./FilesSidebar";
import FilesToolbar from "./FilesToolbar";
import FilesBreadcrumbs from "./FilesBreadcrumbs";
import FilesList from "./FilesList";
import FileDialog from "./FileDialog";
import FilePreview from "./FilePreview";
import FileContextMenu from "./FileContextMenu";
import "../../styles/my-files.css";

type TrashEntry = {
  id: string;
  name: string;
  originalPath: string;
  deletedAt: number;
  isDir: boolean;
  size: number;
};
type ContextState = { entry: FileEntry; x: number; y: number };
type ViewMode = "folder" | "recent" | "favorites" | "category" | "trash";
type LayoutMode = "list" | "grid";
type ClipboardState = { entries: FileEntry[]; mode: "copy" | "cut" } | null;

const RECENT_KEY = "tapas-myfiles-recent";
const FAVORITES_KEY = "tapas-myfiles-favorites";

const extensions: Record<string, string[]> = {
  documents: ["pdf", "doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx", "md"],
  images: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic"],
  videos: ["mp4", "mov", "mkv", "avi", "webm", "m4v"],
  audio: ["mp3", "wav", "aac", "m4a", "flac", "ogg"],
};

function getCategory(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  for (const [category, values] of Object.entries(extensions)) {
    if (values.includes(ext)) return category;
  }
  return "others";
}

function fileIcon(entry: FileEntry) {
  if (entry.isDir) return "📁";
  return ({
    documents: "📄", images: "🖼️", videos: "🎬",
    audio: "🎵", others: "📦"
  } as Record<string, string>)[getCategory(entry.name)];
}

function joinPath(parent: string, name: string) {
  return parent ? `${parent}/${name}` : name;
}

type MyFilesProps = {
  openRequest?: { id: number; path: string } | null;
  onRequestHandled?: () => void;
};

export default function MyFiles({
  openRequest = null,
  onRequestHandled,
}: MyFilesProps) {
  const files = useFiles();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size" | "modified">("name");
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<FileDialogState>(null);
  const [preview, setPreview] = useState<FileEntry | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [infoEntry, setInfoEntry] = useState<FileEntry | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>("folder");
  const [category, setCategory] = useState("documents");
  const [layout, setLayout] = useState<LayoutMode>("list");
  const [clipboard, setClipboard] = useState<ClipboardState>(null);
  const [dragged, setDragged] = useState<FileEntry | null>(null);
  const [trash, setTrash] = useState<TrashEntry[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); }
    catch { return []; }
  });
  const [recent, setRecent] = useState<FileEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
  });
  const [storage, setStorage] = useState<StorageInfo | null>(null);

  const refreshTrash = useCallback(async () => {
    try {
      setTrash(await invoke<TrashEntry[]>("list_trash"));
    } catch (error) {
      console.error("Recycle Bin:", error);
    }
  }, []);

  const refreshStorage = useCallback(async () => {
    try {
      setStorage(await invoke<StorageInfo>("get_storage_info"));
    } catch (error) {
      console.error("Storage information:", error);
    }
  }, []);

  useEffect(() => {
    void refreshTrash();
    void refreshStorage();
  }, [refreshTrash, refreshStorage]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }, [recent]);

  const toggleFavorite = (path: string) => {
    setFavorites((previous) =>
      previous.includes(path) ? previous.filter((item) => item !== path) : [...previous, path]
    );
  };

  const navigate = (path: string) => {
    setSelected([]);
    setActiveView("folder");
    setSearch("");
    setPreview(null);
    void files.loadFiles(path);
  };

  useEffect(() => {
    if (!openRequest) return;

    const path = openRequest.path.trim();
    const invalid =
      path.startsWith("/") ||
      path.split("/").some((part) => part === ".." || part === ".");

    if (invalid) {
      console.error("TAPAS AI requested an invalid folder path:", path);
    } else {
      navigate(path);
    }

    onRequestHandled?.();
  }, [openRequest?.id]);

  const openEntry = (entry: FileEntry) => {
    if (entry.isDir) {
      navigate(entry.path);
      return;
    }
    setRecent((previous) =>
      [entry, ...previous.filter((item) => item.path !== entry.path)].slice(0, 30)
    );
    setPreview(entry);
  };

  const sourceEntries = useMemo(() => {
    if (activeView === "recent") return recent;
    if (activeView === "favorites") {
      return favorites.map((path) => ({
        name: path.split("/").pop() || path,
        path, isDir: false, isFile: true, size: 0, modified: null
      } satisfies FileEntry));
    }
    return files.entries;
  }, [activeView, recent, favorites, files.entries]);

  const filteredEntries = useMemo(() => {
    let result = sourceEntries.filter((entry) =>
      entry.name.toLowerCase().includes(search.toLowerCase())
    );
    if (activeView === "category") {
      result = result.filter((entry) => !entry.isDir && getCategory(entry.name) === category);
    }
    return [...result].sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      if (sortBy === "size") return b.size - a.size;
      if (sortBy === "modified") return (b.modified ?? 0) - (a.modified ?? 0);
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [sourceEntries, search, sortBy, activeView, category]);

  const openDialog = (mode: NonNullable<FileDialogState>["mode"], entry?: FileEntry) => {
    setDialog({ mode, entry });
  };

  const submitDialog = async (value: string) => {
    if (!dialog) return;
    try {
      if (dialog.mode === "file") {
        await files.createFile(value);
        setSearch("");
      } else if (dialog.mode === "folder") {
        await files.createFolder(value);
      } else if (dialog.mode === "rename" && dialog.entry) {
        if (value !== dialog.entry.name) {
          await files.renameEntry(dialog.entry, value);
          const newPath = joinPath(
            dialog.entry.path.split("/").slice(0, -1).join("/"), value
          );
          setFavorites((prev) => prev.map((path) => path === dialog.entry!.path ? newPath : path));
          setRecent((prev) => prev.filter((item) => item.path !== dialog.entry!.path));
        }
      } else if (dialog.mode === "delete" && dialog.entry) {
        await files.deleteEntry(dialog.entry);
        setFavorites((prev) => prev.filter((path) =>
          path !== dialog.entry!.path && !path.startsWith(`${dialog.entry!.path}/`)
        ));
        setRecent((prev) => prev.filter((item) => item.path !== dialog.entry!.path));
        await refreshTrash();
      }
      setSelected([]);
      setDialog(null);
      await refreshStorage();
    } catch (error) {
      window.alert(String(error));
      throw error;
    }
  };

  const changeView = (view: string, selectedCategory?: string) => {
    setActiveView(view as ViewMode);
    if (selectedCategory) setCategory(selectedCategory);
    setSelected([]);
    setSearch("");
    if (view === "trash") void refreshTrash();
  };

  const copySelected = (mode: "copy" | "cut") => {
    const entries = sourceEntries.filter((entry) => selected.includes(entry.path));
    if (entries.length) setClipboard({ entries, mode });
  };

  const pasteEntries = useCallback(async () => {
    if (!clipboard || activeView !== "folder") return;
    for (const entry of clipboard.entries) {
      const destination = joinPath(files.currentPath, entry.name);
      if (destination === entry.path) continue;
      if (clipboard.mode === "copy") {
        await invoke("copy_entry", { path: entry.path, destination });
      } else {
        await invoke("move_entry", { path: entry.path, destination });
        setFavorites((prev) => prev.map((path) =>
          path === entry.path ? destination : path
        ));
      }
    }
    if (clipboard.mode === "cut") setClipboard(null);
    setSelected([]);
    await files.loadFiles(files.currentPath);
    await refreshStorage();
  }, [clipboard, activeView, files, refreshStorage]);

  const moveToTrash = async (entries: FileEntry[]) => {
    for (const entry of entries) {
      await invoke("delete_entry", { path: entry.path });
      setFavorites((prev) => prev.filter((path) =>
        path !== entry.path && !path.startsWith(`${entry.path}/`)
      ));
      setRecent((prev) => prev.filter((item) => item.path !== entry.path));
    }
    setSelected([]);
    await files.loadFiles(files.currentPath);
    await refreshTrash();
    await refreshStorage();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (typing) return;

      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(filteredEntries.map((entry) => entry.path));
      } else if (command && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelected("copy");
      } else if (command && event.key.toLowerCase() === "x") {
        event.preventDefault();
        copySelected("cut");
      } else if (command && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void pasteEntries().catch((error) => window.alert(String(error)));
      } else if (event.key === "Escape") {
        setSelected([]);
        setContextMenu(null);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selected.length) {
          event.preventDefault();
          const entries = sourceEntries.filter((entry) => selected.includes(entry.path));
          void moveToTrash(entries).catch((error) => window.alert(String(error)));
        }
      } else if (event.key === "F2" && selected.length === 1) {
        const entry = sourceEntries.find((item) => item.path === selected[0]);
        if (entry) openDialog("rename", entry);
      } else if (event.key === "Enter" && selected.length === 1) {
        const entry = sourceEntries.find((item) => item.path === selected[0]);
        if (entry) openEntry(entry);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredEntries, selected, sourceEntries, clipboard, pasteEntries]);

  const viewTitle = activeView === "recent" ? "Recent Files"
    : activeView === "favorites" ? "Favorites"
    : activeView === "trash" ? "Recycle Bin"
    : activeView === "category" ? category[0].toUpperCase() + category.slice(1)
    : "Files";

  const restoreTrash = async (entry: TrashEntry) => {
    try {
      await invoke("restore_entry", { id: entry.id });
      await refreshTrash();
      await refreshStorage();
      if (activeView === "folder") await files.loadFiles(files.currentPath);
    } catch (error) {
      window.alert(String(error));
    }
  };

  const permanentlyDelete = async (entry: TrashEntry) => {
    if (!window.confirm(`Permanently delete "${entry.name}"? This cannot be undone.`)) return;
    try {
      await invoke("permanently_delete_entry", { id: entry.id });
      await refreshTrash();
      await refreshStorage();
    } catch (error) {
      window.alert(String(error));
    }
  };

  const emptyTrash = async () => {
    if (!trash.length) return;
    if (!window.confirm("Permanently delete everything in the Recycle Bin? This cannot be undone.")) return;
    try {
      await invoke("empty_trash");
      await refreshTrash();
      await refreshStorage();
    } catch (error) {
      window.alert(String(error));
    }
  };

  return (
    <div className="myfiles-layout">
      <FilesSidebar
        currentPath={files.currentPath}
        activeView={activeView}
        category={category}
        favorites={favorites}
        recent={recent}
        storage={storage}
        trashCount={trash.length}
        onNavigate={navigate}
        onViewChange={changeView}
      />

      <section className="myfiles-main">
        <FilesToolbar
          canGoBack={activeView === "folder" && !!files.currentPath}
          search={search}
          onSearch={setSearch}
          onBack={() => { files.goBack(); setSelected([]); }}
          onRefresh={() => {
            if (activeView === "folder") void files.loadFiles(files.currentPath);
            if (activeView === "trash") void refreshTrash();
          }}
          onNewFile={() => openDialog("file")}
          onNewFolder={() => openDialog("folder")}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <div className="myfiles-extra-toolbar">
          <div className="myfiles-clipboard-actions">
            <button disabled={!selected.length || activeView === "trash"} onClick={() => copySelected("copy")}>Copy</button>
            <button disabled={!selected.length || activeView === "trash"} onClick={() => copySelected("cut")}>Cut</button>
            <button disabled={!clipboard || activeView !== "folder"} onClick={() => void pasteEntries()}>Paste</button>
            <button disabled={!selected.length || activeView === "trash"} onClick={() => {
              const entries = sourceEntries.filter((entry) => selected.includes(entry.path));
              void moveToTrash(entries);
            }}>Move to Bin</button>
          </div>
          <span className="myfiles-selection-count">{selected.length ? `${selected.length} selected` : ""}</span>
          <div className="myfiles-layout-actions">
            <button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")} title="List view">☷</button>
            <button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")} title="Grid view">▦</button>
          </div>
        </div>

        {activeView === "folder" ? (
          <FilesBreadcrumbs path={files.currentPath} onNavigate={navigate} />
        ) : (
          <div className="myfiles-view-heading">
            <span>{viewTitle}</span>
            {activeView === "trash" && (
              <button className="myfiles-empty-trash" disabled={!trash.length} onClick={() => void emptyTrash()}>
                Empty Recycle Bin
              </button>
            )}
          </div>
        )}

        {activeView === "trash" ? (
          <div className="myfiles-list myfiles-trash-list">
            {trash.length === 0 ? (
              <div className="myfiles-message">Recycle Bin is empty.</div>
            ) : trash.map((entry) => (
              <div className="myfiles-trash-row" key={entry.id}>
                <div className="myfiles-name">
                  <span className="myfiles-file-icon">{entry.isDir ? "📁" : "📄"}</span>
                  <div><strong>{entry.name}</strong><small>{entry.originalPath}</small></div>
                </div>
                <span>{new Date(entry.deletedAt * 1000).toLocaleString()}</span>
                <div className="myfiles-actions">
                  <button onClick={() => void restoreTrash(entry)}>Restore</button>
                  <button className="myfiles-delete" onClick={() => void permanentlyDelete(entry)}>Delete permanently</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FilesList
            entries={filteredEntries.map((entry) => ({
              ...entry,
              name: `${fileIcon(entry)} ${entry.name}`
            }))}
            loading={activeView === "folder" ? files.loading : false}
            error={activeView === "folder" ? files.error : ""}
            search={search}
            selected={selected}
            viewMode={layout}
            onSelect={(entry, event) => {
              const original = sourceEntries.find((item) => item.path === entry.path);
              if (!original) return;
              if (event.metaKey || event.ctrlKey) {
                setSelected((prev) => prev.includes(entry.path)
                  ? prev.filter((path) => path !== entry.path)
                  : [...prev, entry.path]);
              } else if (event.shiftKey && selected.length) {
                const paths = filteredEntries.map((item) => item.path);
                const start = paths.indexOf(selected[selected.length - 1]);
                const end = paths.indexOf(entry.path);
                if (start >= 0 && end >= 0) {
                  setSelected(paths.slice(Math.min(start, end), Math.max(start, end) + 1));
                }
              } else {
                setSelected([entry.path]);
              }
            }}
            onOpen={(entry) => {
              const original = sourceEntries.find((item) => item.path === entry.path);
              if (original) openEntry(original);
            }}
            onRename={(entry) => {
              const original = sourceEntries.find((item) => item.path === entry.path);
              if (original) openDialog("rename", original);
            }}
            onDelete={(entry) => {
              const original = sourceEntries.find((item) => item.path === entry.path);
              if (original) openDialog("delete", original);
            }}
            onContextMenu={(entry, event) => {
              event.preventDefault();
              const original = sourceEntries.find((item) => item.path === entry.path);
              if (!original) return;
              setSelected([entry.path]);
              setContextMenu({
                entry: original,
                x: Math.max(4, Math.min(event.clientX, window.innerWidth - 225)),
                y: Math.max(4, Math.min(event.clientY, window.innerHeight - 300))
              });
            }}
            onDragStart={(entry, event) => {
              const original = sourceEntries.find((item) => item.path === entry.path);
              if (!original) return;
              setDragged(original);
              event.dataTransfer.setData("text/plain", original.path);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDrop={(entry, event) => {
              event.preventDefault();
              if (!dragged || !entry.isDir || dragged.path === entry.path) return;
              const destination = joinPath(entry.path, dragged.name);
              void invoke("move_entry", { path: dragged.path, destination })
                .then(() => files.loadFiles(files.currentPath))
                .catch((error) => window.alert(String(error)))
                .finally(() => setDragged(null));
            }}
            onRetry={() => void files.loadFiles(files.currentPath)}
          />
        )}

        <div className="myfiles-footer">
          <span>{activeView === "trash" ? `${trash.length} deleted items` : `${filteredEntries.length} items`}</span>
          <span>{viewTitle} · Home directory access</span>
        </div>
      </section>

      <FileDialog dialog={dialog} onClose={() => setDialog(null)} onSubmit={submitDialog} />

      {preview && (
        <FilePreview path={preview.path} name={preview.name} onClose={() => setPreview(null)} />
      )}

      {contextMenu && (
        <FileContextMenu
          entry={contextMenu.entry}
          x={contextMenu.x}
          y={contextMenu.y}
          isFavorite={favorites.includes(contextMenu.entry.path)}
          onClose={() => setContextMenu(null)}
          onOpen={() => {
            const entry = contextMenu.entry;
            setContextMenu(null);
            openEntry(entry);
          }}
          onRename={() => {
            const entry = contextMenu.entry;
            setContextMenu(null);
            openDialog("rename", entry);
          }}
          onDelete={() => {
            const entry = contextMenu.entry;
            setContextMenu(null);
            openDialog("delete", entry);
          }}
          onCopyName={() => {
            void navigator.clipboard?.writeText(contextMenu.entry.name);
            setContextMenu(null);
          }}
          onToggleFavorite={() => {
            toggleFavorite(contextMenu.entry.path);
            setContextMenu(null);
          }}
          onInfo={() => {
            setInfoEntry(contextMenu.entry);
            setContextMenu(null);
          }}
        />
      )}

      {infoEntry && (
        <div className="myfiles-preview-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setInfoEntry(null);
        }}>
          <section className="myfiles-dialog" role="dialog" aria-modal="true">
            <h3>File Information</h3>
            <p><strong>Name:</strong> {infoEntry.name}</p>
            <p><strong>Type:</strong> {infoEntry.isDir ? "Folder" : "File"}</p>
            <p><strong>Size:</strong> {infoEntry.size.toLocaleString()} bytes</p>
            <p><strong>Location:</strong> {infoEntry.path}</p>
            <p><strong>Modified:</strong> {infoEntry.modified
              ? new Date(infoEntry.modified * 1000).toLocaleString() : "Unknown"}</p>
            <div className="myfiles-dialog-actions">
              <button onClick={() => setInfoEntry(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
