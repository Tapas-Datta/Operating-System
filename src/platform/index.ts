import { invoke } from "@tauri-apps/api/core";
import * as webFiles from "./web-files";

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function platformInvoke<T = unknown>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isDesktop()) return invoke<T>(command, args);
  switch (command) {
    case "ask_tapas_ai": {
      const response = await fetch("/api/tapas-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: args.prompt, context: args.context }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `TAPAS AI request failed (${response.status})`);
      return payload as T;
    }
    case "list_directory": return await webFiles.listDirectory(args.path as string | null | undefined) as T;
    case "create_file": return await webFiles.createFile(String(args.path ?? "")) as T;
    case "create_folder": return await webFiles.createFolder(String(args.path ?? "")) as T;
    case "rename_entry": return await webFiles.renameEntry(String(args.path ?? ""), String(args.newName ?? "")) as T;
    case "delete_entry": return await webFiles.deleteEntry(String(args.path ?? "")) as T;
    case "read_file": return await webFiles.readFile(String(args.path ?? "")) as T;
    case "get_storage_info": return await webFiles.storageInfo() as T;
    case "copy_entry": return await webFiles.copyEntry(String(args.path ?? ""), String(args.destination ?? "")) as T;
    case "move_entry": return await webFiles.moveEntry(String(args.path ?? ""), String(args.destination ?? "")) as T;
    case "list_trash": return await webFiles.listTrash() as T;
    case "restore_entry": return await webFiles.restoreEntry(String(args.id ?? "")) as T;
    case "permanently_delete_entry": return await webFiles.permanentlyDelete(String(args.id ?? "")) as T;
    case "empty_trash": return await webFiles.emptyTrash() as T;
    case "open_macos_system_settings": throw new Error("Native system settings are only available in the TAPAS OS desktop app.");
    default: throw new Error(`${command} is available in the TAPAS OS desktop app, not in the web demo.`);
  }
}

export { webFiles };
