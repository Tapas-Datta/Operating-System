import "./AppStore.css";

export type StoreApp = {
  id: "Notes" | "Calculator" | "Gallery";
  icon: string;
  description: string;
  category: string;
};

const CATALOG: StoreApp[] = [
  { id: "Notes", icon: "📝", description: "Write quick notes and keep them saved on this device.", category: "Productivity" },
  { id: "Calculator", icon: "🧮", description: "A simple calculator for everyday arithmetic.", category: "Utilities" },
  { id: "Gallery", icon: "🖼️", description: "Browse images you choose from your computer.", category: "Media" },
];

type Props = {
  installedApps: string[];
  onInstall: (name: StoreApp["id"]) => void;
  onUninstall: (name: StoreApp["id"]) => void;
};

export default function AppStore({ installedApps, onInstall, onUninstall }: Props) {
  return (
    <div className="tap-store">
      <header className="tap-store-hero">
        <div>
          <p className="tap-store-eyebrow">TAPAS OS · DISCOVER</p>
          <h1>App Store</h1>
          <p>Small, useful apps made for your desktop.</p>
        </div>
        <div className="tap-store-mark" aria-hidden="true">✦</div>
      </header>

      <div className="tap-store-section-heading">
        <div>
          <h2>Explore apps</h2>
          <p>Install an app to add it to your TAPAS workspace.</p>
        </div>
        <span className="tap-store-count">{installedApps.length} installed</span>
      </div>

      <div className="tap-store-grid">
        {CATALOG.map((app) => {
          const installed = installedApps.includes(app.id);
          return (
            <article className="tap-store-card" key={app.id}>
              <div className="tap-store-card-top">
                <span className="tap-store-app-icon" aria-hidden="true">{app.icon}</span>
                <span className="tap-store-category">{app.category}</span>
              </div>
              <h3>{app.id}</h3>
              <p>{app.description}</p>
              <button
                className={`tap-store-action ${installed ? "is-installed" : ""}`}
                onClick={() => installed ? onUninstall(app.id) : onInstall(app.id)}
                type="button"
              >
                {installed ? "Uninstall" : "Install"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="tap-store-footnote">
        These are built-in TAPAS OS apps. Installing enables them in your desktop;
        no third-party software is downloaded.
      </p>
    </div>
  );
}
