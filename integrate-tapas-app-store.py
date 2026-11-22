from pathlib import Path
import shutil
import sys

app_path = Path("src/App.tsx")

if not app_path.exists():
    print("ERROR: Run this script from the tapas-desktop project root.")
    sys.exit(1)

source = app_path.read_text(encoding="utf-8")
original = source


def replace_once(old, new, label):
    global source
    count = source.count(old)

    if count != 1:
        raise RuntimeError(
            f"{label}: expected one matching location, found {count}. "
            "No changes were written."
        )

    source = source.replace(old, new, 1)


replace_once(
    'import TapasAI from "./TapasAI";\n\nimport "./App.css";',
    'import TapasAI from "./TapasAI";\n'
    'import AppStore, { type StoreApp } from "./components/app-store/AppStore";\n'
    'import Notes from "./components/app-store/apps/Notes";\n'
    'import Calculator from "./components/app-store/apps/Calculator";\n'
    'import Gallery from "./components/app-store/apps/Gallery";\n'
    'import "./components/app-store/apps/MiniApps.css";\n\n'
    'import "./App.css";',
    "imports",
)

replace_once(
    '  | "Terminal";',
    '  | "Terminal"\n  | "Notes"\n  | "Calculator"\n  | "Gallery";',
    "AppName union",
)

replace_once(
    '        <defs>',
    '''        {(name === "Notes" || name === "Calculator" || name === "Gallery") && (
          <text x="32" y="43" textAnchor="middle" fontSize="35">
            {name === "Notes" ? "📝" : name === "Calculator" ? "🧮" : "🖼️"}
          </text>
        )}
        <defs>''',
    "AppIcon glyphs",
)

apps_block = '''const APPS: { name: AppName; icon: string }[] = [
  { name: "My Files", icon: "📁" },
  { name: "Browser", icon: "🌐" },
  { name: "Settings", icon: "⚙️" },
  { name: "App Store", icon: "🛍️" },
  { name: "Sicily AI", icon: "☀" },
  { name: "Terminal", icon: "⌘" },
];'''

replace_once(
    apps_block,
    apps_block + '''

const OPTIONAL_APPS: { name: StoreApp["id"]; icon: string }[] = [
  { name: "Notes", icon: "📝" },
  { name: "Calculator", icon: "🧮" },
  { name: "Gallery", icon: "🖼️" },
];

function loadInstalledApps(): StoreApp["id"][] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("tapas-installed-apps") || "[]"
    );

    if (!Array.isArray(value)) return [];

    return OPTIONAL_APPS
      .map((app) => app.name)
      .filter((name) => value.includes(name));
  } catch {
    return [];
  }
}''',
    "optional app catalog",
)

replace_once(
    '  const defaults = APPS.map((item) => item.name);',
    '''  const defaults = [
    ...APPS.map((item) => item.name),
    ...loadInstalledApps(),
  ];''',
    "launcher order defaults",
)

replace_once(
    '  const [search, setSearch] = useState("");',
    '''  const [search, setSearch] = useState("");
  const [installedApps, setInstalledApps] =
    useState<StoreApp["id"][]>(loadInstalledApps);

  useEffect(() => {
    localStorage.setItem(
      "tapas-installed-apps",
      JSON.stringify(installedApps)
    );
  }, [installedApps]);''',
    "installed app state",
)

needle = '''  const [dockOrder, setDockOrder] = useState<AppName[]>(
    () => loadAppOrder("tapas-dock-app-order")
  );'''

replace_once(
    needle,
    needle + '''

  const availableApps = [
    ...APPS,
    ...OPTIONAL_APPS.filter((app) =>
      installedApps.includes(app.name)
    ),
  ];''',
    "available app list",
)

lookup = 'APPS.find((item) => item.name === name)'
if source.count(lookup) != 2:
    raise RuntimeError(
        f"Expected 2 app lookups, found {source.count(lookup)}. No changes written."
    )

source = source.replace(
    lookup,
    'availableApps.find((item) => item.name === name)',
    2,
)

source = source.replace(
    '(typeof APPS)[number]',
    '(typeof availableApps)[number]'
)

replace_once(
    '''  const startAppReorder = (
    source: "desktop" | "dock",''',
    '''  const installApp = (name: StoreApp["id"]) => {
    setInstalledApps((current) =>
      current.includes(name) ? current : [...current, name]
    );

    setDesktopOrder((current) =>
      current.includes(name) ? current : [...current, name]
    );

    setDockOrder((current) =>
      current.includes(name) ? current : [...current, name]
    );

    setDesktopPositions((current) => ({
      ...current,
      [name]: current[name] ?? {
        x: Math.max(24, window.innerWidth - 220),
        y: 40 + OPTIONAL_APPS.findIndex(
          (app) => app.name === name
        ) * 112,
      },
    }));
  };

  const uninstallApp = (name: StoreApp["id"]) => {
    setInstalledApps((current) =>
      current.filter((app) => app !== name)
    );

    setDesktopOrder((current) =>
      current.filter((app) => app !== name)
    );

    setDockOrder((current) =>
      current.filter((app) => app !== name)
    );

    setWindows((current) =>
      current.filter((item) => item.name !== name)
    );
  };

  const startAppReorder = (
    source: "desktop" | "dock",''',
    "install and uninstall handlers",
)

replace_once(
    'left: desktopPositions[app.name].x,\n                top: desktopPositions[app.name].y,',
    'left: desktopPositions[app.name]?.x ?? 24,\n'
    '                top: desktopPositions[app.name]?.y ?? 40,',
    "desktop icon position fallback",
)

replace_once(
    '{APPS.filter((app) =>',
    '{availableApps.filter((app) =>',
    "Start Menu app list",
)

replace_once(
    '    // Other applications\n    return (',
    '''    if (name === "App Store") {
      return (
        <AppStore
          installedApps={installedApps}
          onInstall={installApp}
          onUninstall={uninstallApp}
        />
      );
    }

    if (name === "Notes") return <Notes />;
    if (name === "Calculator") return <Calculator />;
    if (name === "Gallery") return <Gallery />;

    // Other applications
    return (''',
    "App Store and mini-app rendering",
)

if source == original:
    print("No changes made: source already appeared integrated.")
    sys.exit(0)

backup = app_path.with_suffix(".tsx.before-app-store.bak")

if backup.exists():
    print(f"Backup already exists: {backup}. Refusing to overwrite it.")
    sys.exit(1)

shutil.copy2(app_path, backup)
app_path.write_text(source, encoding="utf-8")

print("App Store integration changes applied.")
print(f"Backup created: {backup}")
print("Next run: npm run build")

