import { useMemo, useState } from "react";
import "./AppStore.css";

export type StoreApp = {
  id: string;
  icon: string;
  description: string;
  category: string;
  url?: string;
};

export const BUILT_IN_APPS: StoreApp[] = [
  { id: "Notes", icon: "📝", description: "Write quick notes and keep them saved on this device.", category: "Productivity" },
  { id: "Calculator", icon: "🧮", description: "A simple calculator for everyday arithmetic.", category: "Utilities" },
  { id: "Gallery", icon: "🖼️", description: "Browse images you choose from your computer.", category: "Media" },
];

export const WEB_APPS: StoreApp[] = [
  { id: "GitHub", icon: "🐙", description: "Host code, collaborate on projects, and manage repositories.", category: "Development", url: "https://github.com/" },
  { id: "YouTube", icon: "▶️", description: "Watch videos, tutorials, music, and creator content.", category: "Media", url: "https://www.youtube.com/" },
  { id: "Gmail", icon: "✉️", description: "Send, receive, and organize your email.", category: "Productivity", url: "https://mail.google.com/" },
  { id: "Google Drive", icon: "📁", description: "Store, sync, and share files online.", category: "Productivity", url: "https://drive.google.com/" },
  { id: "ChatGPT", icon: "🤖", description: "Explore ideas, ask questions, and work with AI.", category: "Productivity", url: "https://chatgpt.com/" },
  { id: "Notion", icon: "📓", description: "Organize notes, docs, projects, and team knowledge.", category: "Productivity", url: "https://www.notion.so/" },
  { id: "Canva", icon: "🎨", description: "Create presentations, graphics, and visual content.", category: "Design", url: "https://www.canva.com/" },
  { id: "Figma", icon: "🖌️", description: "Design interfaces and collaborate on prototypes.", category: "Design", url: "https://www.figma.com/" },
  { id: "Wikipedia", icon: "📚", description: "Explore a free online encyclopedia.", category: "Education", url: "https://www.wikipedia.org/" },
  { id: "Khan Academy", icon: "🎓", description: "Learn mathematics, science, computing, and more.", category: "Education", url: "https://www.khanacademy.org/" },
  { id: "Replit", icon: "💻", description: "Write, run, and share code in your browser.", category: "Development", url: "https://replit.com/" },
  { id: "CodePen", icon: "🧪", description: "Experiment with HTML, CSS, and JavaScript.", category: "Development", url: "https://codepen.io/" },
  { id: "Stack Overflow", icon: "🧩", description: "Find programming answers and share technical knowledge.", category: "Development", url: "https://stackoverflow.com/" },
  { id: "Google Calendar", icon: "🗓️", description: "Plan events, meetings, and your daily schedule.", category: "Productivity", url: "https://calendar.google.com/" },
  { id: "Spotify", icon: "🎧", description: "Listen to music, podcasts, and playlists.", category: "Media", url: "https://open.spotify.com/" },
  { id: "Google Maps", icon: "🗺️", description: "Explore places, find directions, and plan journeys.", category: "Utilities", url: "https://maps.google.com/" },
  { id: "Discord", icon: "💬", description: "Join communities and communicate with voice, video, and text.", category: "Communication", url: "https://discord.com/app" },
  { id: "Slack", icon: "🟣", description: "Collaborate with teams through channels and messages.", category: "Communication", url: "https://app.slack.com/" },
  { id: "Trello", icon: "📋", description: "Organize tasks and projects with visual boards.", category: "Productivity", url: "https://trello.com/" },
  { id: "WhatsApp", icon: "🟢", description: "Send messages and stay connected with WhatsApp Web.", category: "Communication", url: "https://web.whatsapp.com/" },
  { id: "Telegram", icon: "✈️", description: "Message people and groups using Telegram Web.", category: "Communication", url: "https://web.telegram.org/" },
  { id: "Reddit", icon: "👽", description: "Explore communities and discussions.", category: "Social", url: "https://www.reddit.com/" },
  { id: "Netflix", icon: "🎬", description: "Stream films and series with an eligible subscription.", category: "Media", url: "https://www.netflix.com/" },
  { id: "Microsoft 365", icon: "🧩", description: "Access Microsoft productivity tools online.", category: "Productivity", url: "https://www.microsoft365.com/" },
];

export const STORE_CATALOG: StoreApp[] = [...BUILT_IN_APPS, ...WEB_APPS];

type Props = {
  installedApps: string[];
  onInstall: (name: StoreApp["id"]) => void;
  onUninstall: (name: StoreApp["id"]) => void;
  onOpen: (app: StoreApp) => void;
};

const CATEGORIES = ["All", "Productivity", "Development", "Education", "Design", "Media", "Utilities", "Communication", "Social"];

export default function AppStore({ installedApps, onInstall, onUninstall, onOpen }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const filteredApps = useMemo(() => STORE_CATALOG.filter((app) => {
    const matchesCategory = category === "All" || app.category === category;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${app.id} ${app.description} ${app.category}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  }), [category, search]);

  return (
    <div className="tap-store">
      <header className="tap-store-hero">
        <div>
          <p className="tap-store-eyebrow">TAPAS OS · DISCOVER</p>
          <h1>App Store</h1>
          <p>Discover useful apps for your TAPAS workspace.</p>
        </div>
        <div className="tap-store-mark" aria-hidden="true">✦</div>
      </header>

      <div className="tap-store-section-heading">
        <div>
          <h2>Explore apps</h2>
          <p>Install a shortcut on your Desktop, then open it in TAPAS Browser.</p>
        </div>
        <span className="tap-store-count">{installedApps.length} installed</span>
      </div>

      <div className="tap-store-toolbar">
        <input aria-label="Search apps" className="tap-store-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apps..." />
        <div className="tap-store-filters" aria-label="Filter by category">
          {CATEGORIES.map((item) => (
            <button key={item} type="button" className={`tap-store-filter ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </div>

      <div className="tap-store-grid">
        {filteredApps.map((app) => {
          const installed = installedApps.includes(app.id);
          const selected = selectedApp === app.id;
          return (
            <article className={`tap-store-card ${selected ? "is-selected" : ""}`} key={app.id}>
              <div className="tap-store-card-top">
                <span className="tap-store-app-icon" aria-hidden="true">{app.icon}</span>
                <span className="tap-store-category">{app.category}</span>
              </div>
              <h3>{app.id}</h3>
              <p>{app.description}</p>
              {selected && <p className="tap-store-detail">{app.url ? `Website: ${new URL(app.url).hostname}` : "Built-in TAPAS OS application"}. {app.url ? "This installs a desktop shortcut; it does not download native software." : "This app runs locally in TAPAS OS."}</p>}
              <div className="tap-store-card-actions">
                <button type="button" className="tap-store-secondary" onClick={() => setSelectedApp(selected ? null : app.id)}>{selected ? "Hide details" : "Details"}</button>
                {installed ? (
                  <>
                    <button type="button" className="tap-store-action" onClick={() => onOpen(app)}>Open</button>
                    <button type="button" className="tap-store-action is-installed" onClick={() => onUninstall(app.id)}>Uninstall</button>
                  </>
                ) : (
                  <button type="button" className="tap-store-action" onClick={() => onInstall(app.id)}>Install</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {filteredApps.length === 0 && <p className="tap-store-empty">No apps found. Try another search or category.</p>}
      <p className="tap-store-footnote">Web apps are shortcuts to online services, not downloaded native applications. Installing or uninstalling apps never changes your Dock.</p>
    </div>
  );
}
