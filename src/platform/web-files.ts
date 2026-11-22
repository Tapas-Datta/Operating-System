import type { FileEntry } from "../types/file";

type StoredEntry = { path: string; name: string; isDir: boolean; blob?: Blob; size: number; modified: number };
type TrashRecord = StoredEntry & { id: string; rootId: string; originalPath: string; deletedAt: number };
const DB_NAME = "tapas-os-web-workspace";
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("entries")) db.createObjectStore("entries", { keyPath: "path" });
      if (!db.objectStoreNames.contains("trash")) db.createObjectStore("trash", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open browser workspace"));
  });
}

function cleanPath(value: string | null | undefined): string {
  const path = (value ?? "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.some(part => part === "." || part === ".." || part.includes("\0"))) throw new Error("Invalid workspace path");
  return parts.join("/");
}
function parentOf(path: string) { return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""; }
function baseName(path: string) { return path.split("/").pop() ?? path; }
function asFileEntry(entry: StoredEntry): FileEntry {
  return { name: entry.name, path: entry.path, isDir: entry.isDir, isFile: !entry.isDir, size: entry.size, modified: entry.modified };
}
function ensureName(name: string) {
  if (!name.trim() || name.includes("/") || name.includes("\\") || name === "." || name === "..") throw new Error("Enter a valid file or folder name");
}
async function allEntries(): Promise<StoredEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readonly");
    const req = tx.objectStore("entries").getAll();
    req.onsuccess = () => resolve(req.result as StoredEntry[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function getEntry(path: string): Promise<StoredEntry | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readonly");
    const req = tx.objectStore("entries").get(path);
    req.onsuccess = () => resolve(req.result as StoredEntry | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function ensureParent(path: string) {
  const parent = parentOf(path);
  if (parent) {
    const record = await getEntry(parent);
    if (!record?.isDir) throw new Error("Parent folder does not exist");
  }
}
async function descendants(path: string) {
  const all = await allEntries();
  return all.filter(entry => entry.path === path || entry.path.startsWith(`${path}/`));
}
async function commitEntries(entries: StoredEntry[], deletePaths: string[] = []) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite");
    const store = tx.objectStore("entries");
    deletePaths.forEach(path => store.delete(path));
    entries.forEach(entry => store.put(entry));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Workspace update failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Workspace update was cancelled"));
  });
  db.close();
}

async function seedWorkspace() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["meta", "entries"], "readwrite");
    const meta = tx.objectStore("meta");
    const check = meta.get("workspace-initialized");
    check.onsuccess = () => {
      if (check.result) return;
      const entries = tx.objectStore("entries");
      for (const name of ["Desktop", "Documents", "Downloads", "Pictures", "Music", "Movies"]) {
        entries.put({ path: name, name, isDir: true, size: 0, modified: Date.now() / 1000 } satisfies StoredEntry);
      }
      meta.put({ key: "workspace-initialized", value: true });
    };
    check.onerror = () => reject(check.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not initialize TAPAS Workspace"));
  });
  db.close();
}

export async function listDirectory(pathValue?: string | null): Promise<FileEntry[]> {
  await seedWorkspace();
  const path = cleanPath(pathValue);
  if (path) { const folder = await getEntry(path); if (!folder?.isDir) throw new Error("Folder not found in TAPAS Workspace"); }
  return (await allEntries()).filter(entry => parentOf(entry.path) === path)
    .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name)).map(asFileEntry);
}
export async function createFile(pathValue: string, blob?: Blob) {
  const path = cleanPath(pathValue); ensureName(baseName(path)); await ensureParent(path);
  if (await getEntry(path)) throw new Error("An item with this name already exists");
  await commitEntries([{ path, name: baseName(path), isDir: false, blob: blob ?? new Blob([""]), size: blob?.size ?? 0, modified: Date.now() / 1000 }]);
}
export async function createFolder(pathValue: string) {
  const path = cleanPath(pathValue); ensureName(baseName(path)); await ensureParent(path);
  if (await getEntry(path)) throw new Error("An item with this name already exists");
  await commitEntries([{ path, name: baseName(path), isDir: true, size: 0, modified: Date.now() / 1000 }]);
}
export async function readFile(pathValue: string): Promise<string> {
  const entry = await getEntry(cleanPath(pathValue));
  if (!entry || entry.isDir) throw new Error("File not found");
  return (entry.blob ?? new Blob([""])).text();
}
export async function renameEntry(pathValue: string, newName: string) {
  const path = cleanPath(pathValue); ensureName(newName);
  const source = await getEntry(path); if (!source) throw new Error("Item not found");
  const destination = cleanPath([parentOf(path), newName].filter(Boolean).join("/"));
  if (destination === path) return;
  if (source.isDir && destination.startsWith(`${path}/`)) throw new Error("A folder cannot be moved inside itself");
  if (await getEntry(destination)) throw new Error("An item with this name already exists");
  const moving = await descendants(path);
  const rewritten = moving.map(entry => {
    const nextPath = destination + entry.path.slice(path.length);
    return { ...entry, path: nextPath, name: baseName(nextPath) };
  });
  await commitEntries(rewritten, moving.map(entry => entry.path));
}
export async function deleteEntry(pathValue: string) {
  const path = cleanPath(pathValue); const records = await descendants(path);
  if (!records.length) throw new Error("Item not found");
  const rootId = crypto.randomUUID(); const deletedAt = Date.now() / 1000;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["entries", "trash"], "readwrite");
    const entries = tx.objectStore("entries"); const trash = tx.objectStore("trash");
    records.forEach(entry => {
      const id = entry.path === path ? rootId : crypto.randomUUID();
      trash.put({ ...entry, id, rootId, originalPath: entry.path, deletedAt } satisfies TrashRecord);
      entries.delete(entry.path);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not move item to Recycle Bin"));
  });
  db.close();
}
async function copyOrMove(pathValue: string, destinationValue: string, move: boolean) {
  const path = cleanPath(pathValue); const destination = cleanPath(destinationValue);
  const source = await getEntry(path);
  if (!source) throw new Error("Source item not found");
  if (destination === path) throw new Error("Source and destination are the same");
  if (source.isDir && destination.startsWith(`${path}/`)) throw new Error("A folder cannot be copied or moved inside itself");
  if (await getEntry(destination)) throw new Error("Destination already exists");
  await ensureParent(destination);
  const moving = await descendants(path);
  const rewritten = moving.map(entry => {
    const nextPath = destination + entry.path.slice(path.length);
    return { ...entry, path: nextPath, name: baseName(nextPath) };
  });
  const existing = new Set((await allEntries()).map(entry => entry.path));
  if (rewritten.some(entry => existing.has(entry.path))) throw new Error("A destination item already exists");
  await commitEntries(rewritten, move ? moving.map(entry => entry.path) : []);
}
export async function copyEntry(path: string, destination: string) { return copyOrMove(path, destination, false); }
export async function moveEntry(path: string, destination: string) { return copyOrMove(path, destination, true); }
async function allTrash(): Promise<TrashRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("trash", "readonly"); const req = tx.objectStore("trash").getAll();
    req.onsuccess = () => resolve(req.result as TrashRecord[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export async function listTrash() {
  return (await allTrash()).filter(entry => entry.id === (entry.rootId ?? entry.id))
    .map(entry => ({ id: entry.rootId, name: entry.name, originalPath: entry.originalPath, deletedAt: entry.deletedAt, isDir: entry.isDir, size: entry.size }))
    .sort((a, b) => b.deletedAt - a.deletedAt);
}
async function updateTrashGroup(rootId: string, restore: boolean) {
  const group = (await allTrash()).filter(entry => (entry.rootId ?? entry.id) === rootId);
  if (!group.length) throw new Error("Recycle Bin item not found");
  if (restore) {
    const root = group.find(entry => entry.id === rootId);
    if (!root) throw new Error("Recycle Bin root item not found");
    await ensureParent(root.originalPath);
    const current = new Set((await allEntries()).map(entry => entry.path));
    if (group.some(entry => current.has(entry.originalPath))) throw new Error("An item already exists at the original location");
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["entries", "trash"], "readwrite");
    const entries = tx.objectStore("entries"); const trash = tx.objectStore("trash");
    group.forEach(record => {
      if (restore) {
        const { id: _id, rootId: _rootId, originalPath: _originalPath, deletedAt: _deletedAt, ...entry } = record;
        entries.put(entry);
      }
      trash.delete(record.id);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Recycle Bin operation failed"));
  });
  db.close();
}
export async function restoreEntry(id: string) { await updateTrashGroup(id, true); }
export async function permanentlyDelete(id: string) { await updateTrashGroup(id, false); }
export async function emptyTrash() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("trash", "readwrite"); tx.objectStore("trash").clear();
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function storageInfo() {
  const entries = await allEntries(); const used = entries.reduce((total, entry) => total + entry.size, 0);
  const estimate = await navigator.storage?.estimate?.(); const total = estimate?.quota ?? 0;
  return { total, used, available: Math.max(0, total - used) };
}
export async function importFiles(files: FileList | File[], currentPath: string) {
  for (const file of Array.from(files)) await createFile([cleanPath(currentPath), file.name].filter(Boolean).join("/"), file);
}
export async function exportFile(pathValue: string) {
  const entry = await getEntry(cleanPath(pathValue)); if (!entry || entry.isDir) throw new Error("File not found");
  const url = URL.createObjectURL(entry.blob ?? new Blob([""])); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = entry.name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
