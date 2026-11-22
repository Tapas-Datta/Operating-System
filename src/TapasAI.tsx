import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./tapas-agent.css";

type Action = {
  type: "list_directory" | "create_folder" | "create_file" | "open_app" | "open_folder";
  path?: string;
  app?: string;
};

type Reply = {
  message: string;
  actions: Action[];
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const allowedApps = ["My Files", "Browser", "Settings", "App Store", "Terminal"];

export default function TapasAI({
  onOpenApp,
  onOpenFolder,
}: {
  onOpenApp: (name: string) => void;
  onOpenFolder: (path: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi! I’m TAPAS AI. I can inspect folders, create folders or empty files, and open TAPAS apps. What should I do?" }
  ]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [pendingAction, setPendingAction] = useState<Action | null>(null);

  const send = async () => {
    const request = prompt.trim();
    if (!request || busy || pendingAction) return;

    setPrompt("");
    setMessages(m => [...m, { role: "user", text: request }]);
    setBusy(true);
    setStatus("Planning task…");

    try {
      const plan = await invoke<Reply>("ask_tapas_ai", {
        prompt: request,
        context: "TAPAS OS desktop. File operations are restricted to the user's Home directory."
      });

      if (plan.message) {
        setMessages(m => [...m, { role: "assistant", text: plan.message }]);
      }

      for (const action of plan.actions || []) {
        if (action.type === "open_app") {
          if (action.app && allowedApps.includes(action.app)) onOpenApp(action.app);
          continue;
        }

        const path = action.path ?? "";

        if (action.type === "open_folder") {
          if (
            path.startsWith("/") ||
            path.split("/").some(part => part === ".." || part === ".")
          ) {
            setMessages(m => [...m, {
              role: "assistant",
              text: "Blocked an invalid folder path. Use a path inside your Home folder."
            }]);
            continue;
          }

          setStatus(`Opening ${path || "Home"} in My Files…`);
          onOpenFolder(path);
          setMessages(m => [...m, {
            role: "assistant",
            text: `Opening ${path || "Home"} in My Files.`
          }]);
          continue;
        }

        if (action.type === "list_directory") {
          setStatus(`Inspecting ${path || "Home"}…`);

          const entries = await invoke<Array<{name: string; is_dir: boolean}>>(
            "list_directory",
            { path: path || null }
          );

          const summary = entries.slice(0, 40)
            .map(e => `${e.is_dir ? "📁" : "📄"} ${e.name}`)
            .join("\n") || "This folder is empty.";

          setMessages(m => [...m, {
            role: "assistant",
            text: `Contents of ${path || "Home"}:\n${summary}`
          }]);
        } else if (action.type === "create_folder" || action.type === "create_file") {
          if (
            !path ||
            path.startsWith("/") ||
            path.split("/").some(part => part === ".." || part === ".")
          ) {
            setMessages(m => [...m, {
              role: "assistant",
              text: "Blocked an invalid path. Use a relative path inside your Home folder."
            }]);
            continue;
          }

          setPendingAction(action);
          setStatus("Awaiting your approval");
          return;
        }
      }

      setStatus("Ready");
    } catch (error) {
      setStatus("Action failed");
      setMessages(m => [...m, {
        role: "assistant",
        text: `I couldn't complete that task: ${String(error)}`
      }]);
    } finally {
      setBusy(false);
    }
  };

  const approveAction = async () => {
    if (!pendingAction || busy) return;

    const action = pendingAction;
    const path = action.path ?? "";
    const label = action.type === "create_folder" ? "Create folder" : "Create empty file";

    setBusy(true);
    setStatus("Executing approved action…");

    try {
      await invoke(action.type, { path });

      setMessages(m => [...m, {
        role: "assistant",
        text: `Success! ${path} was created.`
      }]);

      setPendingAction(null);
      setStatus("Ready");
    } catch (error) {
      setMessages(m => [...m, {
        role: "assistant",
        text: `Could not ${label.toLowerCase()}: ${String(error)}`
      }]);
      setStatus("Action failed");
    } finally {
      setBusy(false);
    }
  };

  const cancelAction = () => {
    if (!pendingAction) return;

    setMessages(m => [...m, {
      role: "assistant",
      text: `Cancelled: ${pendingAction.path}`
    }]);

    setPendingAction(null);
    setStatus("Ready");
  };

  const displayPath = pendingAction?.path
    ? `~/` + pendingAction.path.replace(/^\/+/, "")
    : "";

  return (
    <section className="tapas-agent">
      <header className="tapas-agent-heading">
        <div>
          <span className="tapas-agent-kicker">DESKTOP AGENT</span>
          <h2>TAPAS AI</h2>
          <p>Plan tasks and safely operate TAPAS OS.</p>
        </div>
        <span className="tapas-agent-status">
          ● {busy ? "Working" : pendingAction ? "Awaiting approval" : "Ready"}
        </span>
      </header>

      <div className="tapas-agent-messages" aria-live="polite">
        {messages.map((m, i) => (
          <div className={`tapas-agent-message ${m.role}`} key={i}>
            <small>{m.role === "user" ? "YOU" : "TAPAS AI"}</small>
            <p>{m.text}</p>
          </div>
        ))}
      </div>

      {pendingAction && (
        <div className="tapas-agent-permission">
          <div className="tapas-agent-permission-icon">🔐</div>
          <div className="tapas-agent-permission-content">
            <span className="tapas-agent-kicker">PERMISSION REQUIRED</span>
            <h3>
              {pendingAction.type === "create_folder" ? "Create folder?" : "Create empty file?"}
            </h3>
            <p>TAPAS AI wants your permission to make this change.</p>
            <div className="tapas-agent-permission-path">{displayPath}</div>
            <div className="tapas-agent-permission-actions">
              <button className="tapas-agent-cancel" onClick={cancelAction} disabled={busy}>
                Cancel
              </button>
              <button className="tapas-agent-approve" onClick={() => void approveAction()} disabled={busy}>
                {busy ? "Working…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tapas-agent-footer">
        <span>{status} · File changes require your approval.</span>
        <div className="tapas-agent-input">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask TAPAS AI to do something…"
            rows={2}
            disabled={busy || !!pendingAction}
          />
          <button onClick={() => void send()} disabled={busy || !prompt.trim() || !!pendingAction}>
            {busy ? "Working…" : "Run task"}
          </button>
        </div>
      </div>
    </section>
  );
}
