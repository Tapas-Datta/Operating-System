import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isDesktop } from "../../platform";
import "./browser.css";

type BrowserTab = {
  id: number;
  title: string;
  url: string;
};

type Shortcut = {
  id: string;
  name: string;
  url: string;
};

type DownloadItem = {
  id: string;
  filename: string;
  downloaded: number;
  total: number | null;
  percent: number | null;
  status: string;
  error: string | null;
};

const HOME_URL = "tapas://home";
const OFFSCREEN = -20000;

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "google", name: "Google", url: "https://www.google.com" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com" },
  { id: "facebook", name: "Facebook", url: "https://www.facebook.com" },
  { id: "github", name: "GitHub", url: "https://github.com" },
  { id: "wikipedia", name: "Wikipedia", url: "https://www.wikipedia.org" },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function resolveAddress(value: string) {
  const input = value.trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(input)) return `http://${input}`;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(input)) return `https://${input}`;
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

function faviconUrl(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  } catch {
    return "";
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type BrowserProps = {
  launchRequest?: {
    id: number;
    url: string;
  } | null;
};

function DesktopBrowser({ launchRequest }: BrowserProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const createdViews = useRef(new Set<number>());
  const creatingViews = useRef(new Set<number>());
  const tabsRef = useRef<BrowserTab[]>([]);
  const activeIdRef = useRef(1);

  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 1, title: "New Tab", url: HOME_URL },
  ]);
  const [activeId, setActiveId] = useState(1);
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("Guest mode · Ready to explore");

  const [shortcuts, setShortcuts] = useState<Shortcut[]>(
    () => readStorage("tapas-browser-shortcuts", DEFAULT_SHORTCUTS)
  );
  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [shortcutName, setShortcutName] = useState("");
  const [shortcutUrl, setShortcutUrl] = useState("");

  const [showDownloads, setShowDownloads] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const showDownloadsRef = useRef(false);

  // Open external app requests in a new internal Browser tab.
  useEffect(() => {
    if (!launchRequest) return;

    const id = Date.now();

    setTabs((previous) => [
      ...previous,
      {
        id,
        title: "Sicily AI",
        url: launchRequest.url,
      },
    ]);

    setActiveId(id);
    setAddress(launchRequest.url);
    setMessage("Opening Sicily AI...");
  }, [launchRequest?.id]);

  tabsRef.current = tabs;
  activeIdRef.current = activeId;
  showDownloadsRef.current = showDownloads;

  const activeTab = tabs.find((tab) => tab.id === activeId);
  const activeUrl = activeTab?.url ?? HOME_URL;

  const labelFor = (id: number) => `browser-${id}`;

  const getBounds = () => {
    const element = pageRef.current;
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    };
  };

  const hideView = async (id: number) => {
    if (!createdViews.current.has(id)) return;

    try {
      await invoke("resize_browser_view", {
        label: labelFor(id),
        x: OFFSCREEN,
        y: OFFSCREEN,
        width: 1,
        height: 1,
      });
    } catch (error) {
      console.error("Unable to hide browser tab:", error);
    }
  };

  const positionActiveView = async () => {
    const currentId = activeIdRef.current;
    const currentTab = tabsRef.current.find((tab) => tab.id === currentId);

    if (showDownloadsRef.current) {
      for (const id of createdViews.current) await hideView(id);
      return;
    }

    for (const id of createdViews.current) {
      if (id !== currentId || currentTab?.url === HOME_URL) {
        await hideView(id);
      }
    }

    if (!currentTab || currentTab.url === HOME_URL) return;

    const bounds = getBounds();
    if (!bounds || !createdViews.current.has(currentId)) return;

    try {
      await invoke("resize_browser_view", {
        label: labelFor(currentId),
        ...bounds,
      });
    } catch (error) {
      console.error("Unable to position browser tab:", error);
    }
  };

  useEffect(() => {
    localStorage.setItem("tapas-browser-shortcuts", JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    listen<DownloadItem>("download-progress", (event) => {
      const item = event.payload;
      setDownloads((previous) => {
        const exists = previous.some((download) => download.id === item.id);
        if (!exists) return [item, ...previous];
        return previous.map((download) =>
          download.id === item.id ? item : download
        );
      });
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    }).catch(console.error);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const startDownload = async (event: React.FormEvent) => {
    event.preventDefault();

    const url = resolveAddress(downloadUrl);
    if (!url || !/^https?:\/\//i.test(url)) return;

    const id = `download-${Date.now()}`;
    const filename = (() => {
      try {
        return decodeURIComponent(new URL(url).pathname.split("/").pop() || "download");
      } catch {
        return "download";
      }
    })();

    setDownloads((previous) => [{
      id, filename, downloaded: 0, total: null,
      percent: null, status: "pending", error: null
    }, ...previous]);

    try {
      await invoke("start_download", { id, url });
    } catch (error) {
      setDownloads((previous) => previous.map((item) =>
        item.id === id
          ? { ...item, status: "failed", error: String(error) }
          : item
      ));
    }
  };

  const cancelDownload = async (id: string) => {
    try {
      await invoke("cancel_download", { id });
    } catch (error) {
      console.error("Unable to cancel download:", error);
    }
  };

  useEffect(() => {
    setAddress(activeUrl === HOME_URL ? "" : activeUrl);
  }, [activeId, activeUrl]);

  // Important: switching to an existing tab NEVER navigates it again.
  useEffect(() => {
    let cancelled = false;

    const activate = async () => {
      for (const id of createdViews.current) {
        if (id !== activeId || showDownloads) await hideView(id);
      }

      if (showDownloads) return;

      if (activeUrl === HOME_URL) {
        setMessage("Guest mode · Ready to explore");
        return;
      }

      if (createdViews.current.has(activeId)) {
        await positionActiveView();
        setMessage(`Guest mode · ${activeUrl}`);
        return;
      }

      const bounds = getBounds();
      if (!bounds || creatingViews.current.has(activeId)) return;

      creatingViews.current.add(activeId);

      try {
        await invoke("create_browser_view", {
          label: labelFor(activeId),
          url: activeUrl,
          ...bounds,
        });

        createdViews.current.add(activeId);

        if (!cancelled) {
          setMessage(`Guest mode · ${activeUrl}`);
          await positionActiveView();
        }
      } catch (error) {
        console.error("Browser WebView error:", error);
        if (!cancelled) setMessage(`Browser error: ${String(error)}`);
      } finally {
        creatingViews.current.delete(activeId);
      }
    };

    void activate();

    return () => {
      cancelled = true;
    };
  }, [activeId, activeUrl, showDownloads]);

  // Keep native webviews aligned with the visible browser page.
  useEffect(() => {
    const element = pageRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      void positionActiveView();
    });

    observer.observe(element);
    window.addEventListener("resize", positionActiveView);

    const interval = window.setInterval(positionActiveView, 300);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", positionActiveView);
      window.clearInterval(interval);
    };
  }, []);

  // Close native views only when the Browser component is closed.
  useEffect(() => {
    return () => {
      for (const id of createdViews.current) {
        void invoke("close_browser_view", {
          label: labelFor(id),
        }).catch(console.error);
      }
      createdViews.current.clear();
    };
  }, []);

  const navigate = (value: string) => {
    const url = resolveAddress(value);
    if (!url) return;

    const title = value.trim();

    // Update the existing native view directly.
    // The tab activation effect will not reload it on tab switching.
    if (createdViews.current.has(activeId)) {
      void invoke("navigate_browser_view", {
        label: labelFor(activeId),
        url,
      }).catch((error) => setMessage(`Navigation error: ${String(error)}`));
    }

    setTabs((previous) =>
      previous.map((tab) =>
        tab.id === activeId
          ? { ...tab, title: title.slice(0, 32), url }
          : tab
      )
    );
  };

  const createTab = () => {
    const id = Date.now();
    setTabs((previous) => [
      ...previous,
      { id, title: "New Tab", url: HOME_URL },
    ]);
    setActiveId(id);
  };

  const closeTab = (id: number) => {
    if (createdViews.current.has(id)) {
      void invoke("close_browser_view", { label: labelFor(id) })
        .catch(console.error);
      createdViews.current.delete(id);
    }

    if (tabs.length === 1) {
      const newId = Date.now();
      setTabs([{ id: newId, title: "New Tab", url: HOME_URL }]);
      setActiveId(newId);
      return;
    }

    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);

    if (activeId === id) {
      setActiveId(remaining[remaining.length - 1].id);
    }
  };

  const goHome = () => {
    setTabs((previous) =>
      previous.map((tab) =>
        tab.id === activeId
          ? { ...tab, title: "New Tab", url: HOME_URL }
          : tab
      )
    );
  };

  const addShortcut = (event: React.FormEvent) => {
    event.preventDefault();

    const name = shortcutName.trim();
    const url = resolveAddress(shortcutUrl);

    if (!name || !url || !/^https?:\/\//i.test(url)) return;

    setShortcuts((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.slice(0, 24),
        url,
      },
    ]);

    setShortcutName("");
    setShortcutUrl("");
    setShowAddShortcut(false);
  };

  const removeShortcut = (id: string) => {
    setShortcuts((previous) => previous.filter((item) => item.id !== id));
  };

  return (
    <div className="browser-shell">
      <div className="browser-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`browser-tab ${activeId === tab.id ? "active" : ""}`}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.url === HOME_URL ? (
              <span>🌐</span>
            ) : (
              <img
                className="browser-tab-favicon"
                src={faviconUrl(tab.url)}
                alt=""
              />
            )}
            <span className="browser-tab-title">{tab.title}</span>
            <button
              onClick={(event) => {
                event.stopPropagation();
                closeTab(tab.id);
              }}
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
        <button className="browser-new-tab" onClick={createTab}>+</button>
      </div>

      <div className="browser-toolbar">
        <button
          className="browser-nav-button"
          onClick={() => void invoke("browser_action", {
            label: labelFor(activeId),
            action: "back",
          }).catch((error) => setMessage(String(error)))}
          title="Back"
        >←</button>

        <button
          className="browser-nav-button"
          onClick={() => void invoke("browser_action", {
            label: labelFor(activeId),
            action: "forward",
          }).catch((error) => setMessage(String(error)))}
          title="Forward"
        >→</button>

        <button
          className="browser-nav-button"
          onClick={() => void invoke("browser_action", {
            label: labelFor(activeId),
            action: "reload",
          }).catch((error) => setMessage(String(error)))}
          title="Reload"
        >⟳</button>

        <button onClick={goHome} title="Home">⌂</button>

        <form
          className="browser-address-form"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(address);
          }}
        >
          <span>⌕</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Search or enter a website address"
          />
          <button type="submit">Go</button>
        </form>

        <button
          className={`browser-nav-button ${showDownloads ? "download-active" : ""}`}
          onClick={() => setShowDownloads((value) => !value)}
          title="Open Download Manager"
        >⬇</button>

        <span className="browser-ad-status" title="Basic ad and tracker filtering">
          ◈ Ad filter ON
        </span>
      </div>

      {showDownloads && (
        <section className="browser-download-panel">
          <div className="browser-download-heading">
            <div>
              <h2>Download Manager</h2>
              <p>Manage your downloads</p>
            </div>
            <button onClick={() => setShowDownloads(false)}>Close ×</button>
          </div>

          <form className="browser-download-form" onSubmit={startDownload}>
            <input
              value={downloadUrl}
              onChange={(event) => setDownloadUrl(event.target.value)}
              placeholder="Paste a direct download URL (HTTPS)"
              type="url"
              required
            />
            <button type="submit">Start download</button>
          </form>

          <div className="browser-download-list">
            {downloads.length === 0 ? (
              <p className="browser-download-empty">No downloads yet.</p>
            ) : downloads.map((item) => (
              <article className="browser-download-item" key={item.id}>
                <div className="browser-download-item-top">
                  <strong>{item.filename}</strong>
                  <span>{item.status}</span>
                </div>
                <div className="browser-download-progress">
                  <div style={{ width: `${item.percent ?? 0}%` }} />
                </div>
                <div className="browser-download-meta">
                  <span>
                    {formatBytes(item.downloaded)}
                    {item.total !== null ? ` / ${formatBytes(item.total)}` : ""}
                    {item.percent !== null ? ` · ${item.percent.toFixed(1)}%` : ""}
                  </span>
                  {item.status === "downloading" && (
                    <button onClick={() => void cancelDownload(item.id)}>Cancel</button>
                  )}
                </div>
                {item.error && <p className="browser-download-error">{item.error}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="browser-page" ref={pageRef}>
        {activeUrl === HOME_URL && !showDownloads && (
          <div className="browser-home">
            <div className="browser-logo">T</div>
            <p className="browser-eyebrow">TAPAS OS · PRIVATE BROWSING SPACE</p>
            <h1>Explore the web.</h1>
            <p className="browser-description">
              Your personal space to explore the internet.
            </p>

            <form
              className="browser-home-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(address);
              }}
            >
              <span>⌕</span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Search Google or enter a URL"
              />
              <button type="submit">Search</button>
            </form>

            <div className="browser-home-links">
              {shortcuts.map((site) => (
                <div className="browser-shortcut" key={site.id}>
                  <button
                    className="browser-shortcut-open"
                    onClick={() => navigate(site.url)}
                    title={site.url}
                  >
                    <img
                      className="browser-shortcut-favicon"
                      src={faviconUrl(site.url)}
                      alt=""
                      loading="lazy"
                    />
                    <span>{site.name}</span>
                  </button>
                  <button
                    className="browser-shortcut-remove"
                    onClick={() => removeShortcut(site.id)}
                    title={`Remove ${site.name}`}
                    aria-label={`Remove ${site.name}`}
                  >×</button>
                </div>
              ))}

              <button
                className="browser-shortcut-add"
                onClick={() => setShowAddShortcut((value) => !value)}
              >
                <span>＋</span>
                <span>Add shortcut</span>
              </button>
            </div>

            {showAddShortcut && (
              <form className="browser-shortcut-form" onSubmit={addShortcut}>
                <input
                  value={shortcutName}
                  onChange={(event) => setShortcutName(event.target.value)}
                  placeholder="Website name (e.g. Facebook)"
                  maxLength={24}
                  required
                />
                <input
                  value={shortcutUrl}
                  onChange={(event) => setShortcutUrl(event.target.value)}
                  placeholder="Website URL (e.g. facebook.com)"
                  required
                />
                <div>
                  <button type="submit">Add</button>
                  <button
                    type="button"
                    onClick={() => setShowAddShortcut(false)}
                  >Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="browser-status">{message}</div>
    </div>
  );
}

function WebBrowser({ launchRequest }: BrowserProps) {
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("Web demo · Websites open in a new browser tab");
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(
    () => readStorage("tapas-browser-shortcuts", DEFAULT_SHORTCUTS)
  );
  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [shortcutName, setShortcutName] = useState("");
  const [shortcutUrl, setShortcutUrl] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (launchRequest?.url) setAddress(launchRequest.url);
  }, [launchRequest?.id]);

  useEffect(() => {
    localStorage.setItem("tapas-browser-shortcuts", JSON.stringify(shortcuts));
  }, [shortcuts]);

  const openWebsite = (value: string) => {
    const url = resolveAddress(value);
    if (!url || !/^https?:\/\//i.test(url)) return;
    const opened = window.open(url, "_blank");
    if (!opened) {
      setMessage("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
      return;
    }
    opened.opener = null;
    setHistory(previous => [url, ...previous.filter(item => item !== url)].slice(0, 20));
    setAddress(url);
    setMessage(`Opened ${url} in a new browser tab.`);
  };

  const addShortcut = (event: React.FormEvent) => {
    event.preventDefault();
    const name = shortcutName.trim();
    const url = resolveAddress(shortcutUrl);
    if (!name || !url || !/^https?:\/\//i.test(url)) return;
    setShortcuts(previous => [...previous, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.slice(0, 24), url,
    }]);
    setShortcutName("");
    setShortcutUrl("");
    setShowAddShortcut(false);
  };

  return (
    <div className="browser-shell">
      <div className="browser-tabs">
        <div className="browser-tab active"><span>🌐</span><span className="browser-tab-title">TAPAS Web</span></div>
      </div>
      <div className="browser-toolbar">
        <button className="browser-nav-button" onClick={() => setMessage("Use your browser's Back button to return from external websites.")} title="Back">←</button>
        <button className="browser-nav-button" onClick={() => setMessage("External pages are managed by your browser.")} title="Forward">→</button>
        <button className="browser-nav-button" onClick={() => openWebsite(address)} title="Open again">⟳</button>
        <button onClick={() => { setAddress(""); setMessage("Web demo · Ready to explore"); }} title="Home">⌂</button>
        <form className="browser-address-form" onSubmit={event => { event.preventDefault(); openWebsite(address); }}>
          <span>⌕</span>
          <input value={address} onChange={event => setAddress(event.target.value)} placeholder="Search or enter a website address" />
          <button type="submit">Open</button>
        </form>
      </div>
      <div className="browser-home">
        <div className="browser-home-content">
          <div className="browser-home-logo">T</div>
          <h1>TAPAS Browser</h1>
          <p>{message}</p>
          <div className="browser-shortcuts">
            {shortcuts.map(item => (
              <button className="browser-shortcut" key={item.id} onClick={() => openWebsite(item.url)}>
                <img src={faviconUrl(item.url)} alt="" />
                <span>{item.name}</span>
              </button>
            ))}
            <button className="browser-shortcut" onClick={() => setShowAddShortcut(true)}><span>＋</span><span>Add shortcut</span></button>
          </div>
          {showAddShortcut && (
            <form className="browser-shortcut-form" onSubmit={addShortcut}>
              <input value={shortcutName} onChange={event => setShortcutName(event.target.value)} placeholder="Name" required />
              <input value={shortcutUrl} onChange={event => setShortcutUrl(event.target.value)} placeholder="https://example.com" required />
              <button type="submit">Save</button>
              <button type="button" onClick={() => setShowAddShortcut(false)}>Cancel</button>
            </form>
          )}
          {history.length > 0 && <div className="browser-web-history"><strong>Recently opened</strong>{history.slice(0, 5).map(url => <button key={url} onClick={() => openWebsite(url)}>{url}</button>)}</div>}
          <small className="browser-web-note">For security and compatibility, the Web demo opens websites in your browser instead of embedding them inside TAPAS OS. The installed Desktop app retains its native browser window.</small>
        </div>
      </div>
    </div>
  );
}

export default function Browser(props: BrowserProps) {
  return isDesktop() ? <DesktopBrowser {...props} /> : <WebBrowser {...props} />;
}
