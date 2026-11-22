
import { useEffect, useState } from "react";
import { platformInvoke, isDesktop } from "./platform";

type SettingsProps = {
  theme: string;
  setTheme: (value: string) => void;
  wallpaper: string;
  setWallpaper: (value: string) => void;
};

const categories = [
  { id: "appearance", name: "Appearance", icon: "🎨" },
  { id: "display", name: "Display", icon: "🖥️" },
  { id: "sound", name: "Sound", icon: "🔊" },
  { id: "personalization", name: "Personalization", icon: "✨" },
  { id: "about", name: "About", icon: "ⓘ" },
  { id: "wifi", name: "Wi-Fi", icon: "📶" },
  { id: "bluetooth", name: "Bluetooth", icon: "ᛒ" },
  { id: "network", name: "Network", icon: "🌐" },
  { id: "vpn", name: "VPN", icon: "🛡️" },
  { id: "battery", name: "Battery", icon: "🔋" },
  { id: "accessibility", name: "Accessibility", icon: "♿" },
  { id: "desktop-dock", name: "Desktop & Dock", icon: "🖥️" },
  { id: "notifications", name: "Notifications", icon: "🔔" },
  { id: "focus", name: "Focus", icon: "🌙" },
  { id: "privacy", name: "Privacy & Security", icon: "🔒" },
  { id: "storage", name: "Storage", icon: "💾" },
  { id: "updates", name: "System Updates", icon: "🔄" },
  { id: "language", name: "Language & Region", icon: "🌍" },
];

const wallpapers = [
  {
    name: "Midnight",
    value: "midnight",
    background: "linear-gradient(135deg, #101321, #071c27)",
  },
  {
    name: "Purple Dream",
    value: "purple",
    background: "linear-gradient(135deg, #30245e, #101321)",
  },
  {
    name: "Ocean",
    value: "ocean",
    background: "linear-gradient(135deg, #063b54, #071321)",
  },
  {
    name: "Sunset",
    value: "sunset",
    background: "linear-gradient(135deg, #783d52, #24152e)",
  },
];

function Settings({
  theme,
  setTheme,
  wallpaper,
  setWallpaper,
}: SettingsProps) {
  const [activeCategory, setActiveCategory] =
    useState("appearance");

  const [displayScale, setDisplayScale] = useState(
    () => localStorage.getItem("tapas-display-scale") || "100"
  );

  useEffect(() => {
    const savedScale =
      localStorage.getItem("tapas-display-scale") || "100";

    document.documentElement.style.zoom =
      `${Number(savedScale) / 100}`;
  }, []);

  const updateScale = (value: string) => {
    setDisplayScale(value);
    localStorage.setItem("tapas-display-scale", value);

    document.documentElement.style.zoom =
      `${Number(value) / 100}`;
  };

  const handleWallpaperUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Please select an image smaller than 3 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setWallpaper(reader.result);
      }
    };

    reader.onerror = () => {
      alert("Unable to read this image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-heading">
          <span className="settings-sidebar-icon">⚙️</span>
          <div>
            <h2>Settings</h2>
            <p>System preferences</p>
          </div>
        </div>

        <div className="settings-navigation">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`settings-nav-item ${
                activeCategory === category.id ? "active" : ""
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        <div className="settings-sidebar-footer">
          TAPAS OS · Version 0.4
        </div>
      </aside>

      <section className="settings-main">
        {activeCategory === "appearance" && (
          <>
            <div className="settings-page-heading">
              <p className="settings-eyebrow">PERSONALIZATION</p>
              <h1>Appearance</h1>
              <p>Customize how TAPAS OS looks.</p>
            </div>

            <div className="settings-section">
              <h3>Interface Theme</h3>
              <p>Choose your preferred system appearance.</p>

              <div className="theme-options">
                <button
                  className={`theme-card ${
                    theme === "dark" ? "selected" : ""
                  }`}
                  onClick={() => setTheme("dark")}
                >
                  <div className="theme-preview dark-preview">
                    <span>◐</span>
                    <div />
                    <div />
                  </div>
                  <strong>Dark</strong>
                  <small>Dark interface</small>
                </button>

                <button
                  className={`theme-card ${
                    theme === "light" ? "selected" : ""
                  }`}
                  onClick={() => setTheme("light")}
                >
                  <div className="theme-preview light-preview">
                    <span>☀</span>
                    <div />
                    <div />
                  </div>
                  <strong>Light</strong>
                  <small>Light interface</small>
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>Desktop Wallpaper</h3>
              <p>Select a background for your desktop.</p>

              <div className="wallpaper-options">
                {wallpapers.map((item) => (
                  <button
                    key={item.value}
                    className={`wallpaper-card ${
                      wallpaper === item.value ? "selected" : ""
                    }`}
                    onClick={() => setWallpaper(item.value)}
                  >
                    <div
                      className="wallpaper-preview"
                      style={{ background: item.background }}
                    />
                    <span>{item.name}</span>
                  </button>
                ))}

                <label className="wallpaper-upload-card">
                  <span className="upload-icon">＋</span>
                  <strong>Choose Your Photo</strong>
                  <small>Upload your own wallpaper</small>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWallpaperUpload}
                  />
                </label>
              </div>

              {wallpaper.startsWith("data:image/") && (
                <div className="custom-wallpaper-info">
                  <span>✓ Custom wallpaper selected</span>
                  <button
                    onClick={() => setWallpaper("midnight")}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeCategory === "display" && (
          <>
            <div className="settings-page-heading">
              <p className="settings-eyebrow">HARDWARE</p>
              <h1>Display</h1>
              <p>Configure your interface scaling.</p>
            </div>

            <div className="settings-section">
              <h3>Interface Scale</h3>
              <p>Choose the size of the interface.</p>

              <div className="settings-choice-list">
                {["80", "90", "100", "110", "120"].map((value) => (
                  <button
                    key={value}
                    className={`settings-choice ${
                      displayScale === value ? "selected" : ""
                    }`}
                    onClick={() => updateScale(value)}
                  >
                    <span>{value}%</span>
                    {displayScale === value && <span>✓</span>}
                  </button>
                ))}
              </div>

              <small className="settings-note">
                Display scale is saved automatically.
              </small>
            </div>
          </>
        )}

        {activeCategory === "sound" && (
          <>
            <div className="settings-page-heading">
              <p className="settings-eyebrow">SYSTEM</p>
              <h1>Sound</h1>
              <p>Manage system sound preferences.</p>
            </div>

            <div className="settings-section">
              <h3>Sound is managed by macOS</h3>
              <p>
                TAPAS OS does not currently control the Mac system volume
                or output devices. Open macOS System Settings to manage them.
              </p>
              {isDesktop() ? (
                <button className="settings-option" onClick={() => void platformInvoke("open_macos_system_settings").catch(error => alert(String(error)))}>
                  Open macOS System Settings ↗
                </button>
              ) : (
                <small className="settings-note">Native sound controls are available in the installed Desktop app. Your browser manages web audio settings.</small>
              )}
            </div>
          </>
        )}

        {activeCategory === "personalization" && (
          <>
            <div className="settings-page-heading">
              <p className="settings-eyebrow">YOUR EXPERIENCE</p>
              <h1>Personalization</h1>
              <p>Control your desktop experience.</p>
            </div>

            <div className="settings-section">
              <h3>Animation preferences</h3>
              <p>
                A system-wide animation control is not implemented yet.
                No inactive toggle is shown here.
              </p>
            </div>
          </>
        )}

        {[
          "wifi", "bluetooth", "network", "vpn", "battery",
          "accessibility", "desktop-dock", "notifications", "focus",
          "privacy", "storage", "updates", "language"
        ].includes(activeCategory) && (
          <div className="settings-page-heading">
            <p className="settings-eyebrow">MACOS INTEGRATION</p>
            <h1>{categories.find(item => item.id === activeCategory)?.name}</h1>
            <p>
              This feature is managed by macOS. TAPAS OS will only show
              controls when a real system integration is available.
            </p>
            <div className="settings-section">
              <h3>Native system controls</h3>
              <p>
                Open macOS System Settings to view and manage the actual
                hardware or operating-system configuration.
              </p>
              {isDesktop() ? (
                <button
                  className="settings-option"
                  onClick={() => {
                    void platformInvoke("open_macos_system_settings").catch(error => alert(String(error)));
                  }}
                >
                  Open macOS System Settings ↗
                </button>
              ) : (
                <small className="settings-note">These controls depend on your operating system and are available only in the installed Desktop app.</small>
              )}
              <small className="settings-note">
                TAPAS OS does not report or change a setting unless it can
                verify the actual system state.
              </small>
            </div>
          </div>
        )}

        {activeCategory === "about" && (
          <>
            <div className="settings-page-heading">
              <p className="settings-eyebrow">SYSTEM INFORMATION</p>
              <h1>About TAPAS OS</h1>
              <p>Information about your desktop environment.</p>
            </div>

            <div className="settings-section">
              <div className="about-logo">T</div>
              <h2>TAPAS OS</h2>
              <p>Desktop Environment</p>

              <div className="about-information">
                <div>
                  <span>Version</span>
                  <strong>0.4.0</strong>
                </div>
                <div>
                  <span>Frontend</span>
                  <strong>React + TypeScript</strong>
                </div>
                <div>
                  <span>Desktop Framework</span>
                  <strong>Tauri</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Settings;
