import { useCallback, useEffect, useState } from "react";
import { platformInvoke } from "../platform";
import type { FileEntry } from "../types/file";

export function useFiles() {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError("");

    try {
      const result = await platformInvoke<FileEntry[]>("list_directory", {
        path: path || null,
      });
      setEntries(result);
      setCurrentPath(path);
    } catch (err) {
      setError(String(err));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles("");
  }, [loadFiles]);

  const createFile = async (name: string) => {
    const path = currentPath ? `${currentPath}/${name}` : name;
    await platformInvoke("create_file", { path });
    await loadFiles(currentPath);
  };

  const createFolder = async (name: string) => {
    const path = currentPath ? `${currentPath}/${name}` : name;
    await platformInvoke("create_folder", { path });
    await loadFiles(currentPath);
  };

  const renameEntry = async (entry: FileEntry, newName: string) => {
    await platformInvoke("rename_entry", {
      path: entry.path,
      newName,
    });
    await loadFiles(currentPath);
  };

  const deleteEntry = async (entry: FileEntry) => {
    await platformInvoke("delete_entry", { path: entry.path });
    await loadFiles(currentPath);
  };

  const goBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    void loadFiles(parts.join("/"));
  };

  return {
    currentPath,
    entries,
    loading,
    error,
    loadFiles,
    createFile,
    createFolder,
    renameEntry,
    deleteEntry,
    goBack,
  };
}
