export type FileEntry = {
  name: string;
  path: string;
  isDir: boolean;
  isFile: boolean;
  size: number;
  modified: number | null;
};

export type FileDialogMode = "file" | "folder" | "rename" | "delete";

export type FileDialogState = {
  mode: FileDialogMode;
  entry?: FileEntry;
} | null;
