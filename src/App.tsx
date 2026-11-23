
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { platformInvoke, isDesktop } from "./platform";

import Settings from "./Settings";
import MyFiles from "./components/my-files/MyFiles";
import Browser from "./components/browser/Browser";
import TapasAI from "./TapasAI";
import AppStore, { BUILT_IN_APPS, STORE_CATALOG, WEB_APPS, type StoreApp } from "./components/app-store/AppStore";
import Notes from "./components/app-store/apps/Notes";
import Calculator from "./components/app-store/apps/Calculator";
import Gallery from "./components/app-store/apps/Gallery";
import "./components/app-store/apps/MiniApps.css";

import "./App.css";

type AppName =
  | "My Files"
  | "Browser"
  | "Settings"
  | "App Store"
  | "AI"
  | "Sicily AI"
  | "Terminal"
  | "Notes"
  | "Calculator"
  | "Gallery"
  | "GitHub" | "YouTube" | "Gmail" | "Google Drive" | "ChatGPT" | "Notion"
  | "Canva" | "Figma" | "Wikipedia" | "Khan Academy" | "Replit" | "CodePen"
  | "Stack Overflow" | "Google Calendar" | "Spotify" | "Google Maps"
  | (string & {});

type Layout = "normal" | "maximized" | "left" | "right";

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OpenWindow = {
  name: AppName;
  minimized: boolean;
  z: number;
  position: Rect;
  restorePosition: Rect | null;
  layout: Layout;
};

type DragState = {
  name: AppName;
  offsetX: number;
  offsetY: number;
};

type ResizeState = {
  name: AppName;
  direction: ResizeDirection;
  startX: number;
  startY: number;
  original: Rect;
};

type DesktopIconPosition = {
  x: number;
  y: number;
};

type DesktopContextMenuState = { x: number; y: number; appName: AppName } | null;

type DesktopIconDragState = {
  name: AppName;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function AppIcon({ name }: { name: AppName }) {
  const slug = name.toLowerCase().replace(/\s+/g, "-");

  return (
    <span className={`app-icon-art app-icon-${slug}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        {name === "My Files" && (
          <>
            <path d="M9 19a5 5 0 0 1 5-5h13l6 7h17a5 5 0 0 1 5 5v20a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V19Z" fill="url(#folderBack)" />
            <path d="M9 27a5 5 0 0 1 5-5h36a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V27Z" fill="url(#folderFront)" />
            <path d="M12 29h40" stroke="#FFF2C4" strokeOpacity=".7" strokeWidth="2" />
          </>
        )}
        {name === "Browser" && (
          <>
            <circle cx="31" cy="30" r="17" fill="url(#planet)" />
            <ellipse cx="31" cy="31" rx="26" ry="9" transform="rotate(-28 31 31)" stroke="#B8F4FF" strokeWidth="4" />
            <path d="M18 19c5-7 14-9 22-5" stroke="#FFF" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {name === "Settings" && (
          <>
            <path d="M27 7h10l2 7 5 2 6-3 7 8-4 6 1 6 5 5-5 9-7-1-5 4-2 7H27l-2-7-5-3-7 2-5-9 5-6-1-6-5-5 6-8 7 2 5-3 2-7Z" fill="url(#gear)" />
            <circle cx="32" cy="32" r="10" fill="#38217D" stroke="#E6D8FF" strokeWidth="3" />
          </>
        )}
        {name === "App Store" && (
          <>
            <path d="m32 8 22 12v24L32 56 10 44V20L32 8Z" fill="url(#cube)" />
            <path d="m10 20 22 13 22-13M32 33v23" stroke="#E9FFFF" strokeOpacity=".85" strokeWidth="2" />
            <path d="m23 25 18 10M41 25 23 35" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {name === "AI" && (
          <>
            <path d="M32 5c4 15 8 19 23 27-15 4-19 8-23 27C28 40 24 36 9 32 24 24 28 20 32 5Z" fill="url(#spark)" />
            <circle cx="48" cy="13" r="3" fill="#D8F6FF" />
            <circle cx="13" cy="48" r="2.5" fill="#E7D9FF" />
          </>
        )}
        {name === "Sicily AI" && (
          <>
            <circle cx="32" cy="27" r="17" fill="url(#sicilySun)" />
            <path d="M8 47c7-2 11-8 15-17l6 7 5-13 7 14 5-6 10 15H8Z" fill="url(#sicilyIsland)" />
            <path d="M27 28 32 17l5 11" stroke="#FFF3D6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 51h40" stroke="#FFE8B8" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {name === "Terminal" && (
          <>
            <rect x="7" y="10" width="50" height="44" rx="11" fill="#101B36" stroke="#74DFFF" strokeOpacity=".6" strokeWidth="2" />
            <path d="m19 23 11 9-11 9M35 42h11" stroke="url(#terminalLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {STORE_CATALOG.some((app) => app.id === name) && (
          <text x="32" y="43" textAnchor="middle" fontSize="35">
            {STORE_CATALOG.find((app) => app.id === name)?.icon}
          </text>
        )}
        <defs>
          <linearGradient id="folderBack" x1="12" y1="14" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE29A"/><stop offset="1" stopColor="#E88A2D"/>
          </linearGradient>
          <linearGradient id="folderFront" x1="15" y1="24" x2="48" y2="53" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFD36B"/><stop offset="1" stopColor="#FF9B36"/>
          </linearGradient>
          <linearGradient id="planet" x1="18" y1="12" x2="48" y2="49" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8BF0FF"/><stop offset=".55" stopColor="#397FEA"/><stop offset="1" stopColor="#713CE0"/>
          </linearGradient>
          <linearGradient id="gear" x1="13" y1="8" x2="53" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF"/><stop offset="1" stopColor="#B9A5FF"/>
          </linearGradient>
          <linearGradient id="cube" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#75E8FF"/><stop offset="1" stopColor="#3974E8"/>
          </linearGradient>
          <linearGradient id="spark" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A8F5FF"/><stop offset=".5" stopColor="#8B78FF"/><stop offset="1" stopColor="#E2A5FF"/>
          </linearGradient>
          <linearGradient id="sicilySun" x1="20" y1="10" x2="44" y2="45" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE9A8"/><stop offset="1" stopColor="#F28B55"/>
          </linearGradient>
          <linearGradient id="sicilyIsland" x1="10" y1="20" x2="53" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#63D6C5"/><stop offset="1" stopColor="#176D79"/>
          </linearGradient>
          <linearGradient id="terminalLine" x1="19" y1="23" x2="46" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8BF5FF"/><stop offset="1" stopColor="#45B9FF"/>
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

const APPS: { name: AppName; icon: string }[] = [
  { name: "My Files", icon: "📁" },
  { name: "Browser", icon: "🌐" },
  { name: "Settings", icon: "⚙️" },
  { name: "App Store", icon: "🛍️" },
  { name: "Sicily AI", icon: "☀" },
  { name: "Terminal", icon: "⌘" },
];

const OPTIONAL_APPS: { name: StoreApp["id"]; icon: string }[] = BUILT_IN_APPS.map((app) => ({ name: app.id, icon: app.icon }));

function loadInstalledApps(): StoreApp["id"][] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("tapas-installed-apps") || "[]"
    );

    if (!Array.isArray(value)) return [];

    return [...OPTIONAL_APPS.map((app) => app.name), ...WEB_APPS.map((app) => app.id)]
      .filter((name) => value.includes(name));
  } catch {
    return [];
  }
}

function loadAppOrder(key: string, includeInstalled = true): AppName[] {
  const defaults = [
    ...APPS.map((item) => item.name),
    ...(includeInstalled ? loadInstalledApps() : []),
  ];

  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]") as AppName[];
    const valid = saved.filter(
      (name) => defaults.includes(name)
    );
    return [
      ...valid,
      ...defaults.filter((name) => !valid.includes(name)),
    ];
  } catch {
    return defaults;
  }
}

const ICON_COLUMNS = 2;
const ICON_STEP_X = 100;
const ICON_STEP_Y = 112;

function slotPosition(index: number): DesktopIconPosition {
  const baseX = Math.max(24, window.innerWidth - 220);
  return {
    x: Math.max(0, Math.min(window.innerWidth - 100, baseX + (index % ICON_COLUMNS) * ICON_STEP_X)),
    y: 40 + Math.floor(index / ICON_COLUMNS) * ICON_STEP_Y,
  };
}

function loadDesktopPositions(): Record<AppName, DesktopIconPosition> {
  const baseX = Math.max(24, window.innerWidth - 220);

  const defaults = Object.fromEntries(
    APPS.map((app, index) => [
      app.name,
      {
        x: Math.min(window.innerWidth - 100, baseX + (index % 2) * 100),
        y: 40 + Math.floor(index / 2) * 112,
      },
    ])
  ) as Record<AppName, DesktopIconPosition>;

  try {
    const saved = JSON.parse(
      localStorage.getItem("tapas-desktop-icon-positions") || "{}"
    );

    // Restore saved positions for built-in apps AND installed store apps.
    const knownNames = new Set<string>([
      ...APPS.map((app) => app.name),
      ...BUILT_IN_APPS.map((app) => app.id),
      ...WEB_APPS.map((app) => app.id),
    ]);

    for (const [name, position] of Object.entries(
      (saved && typeof saved === "object" ? saved : {}) as Record<string, DesktopIconPosition>
    )) {
      if (
        knownNames.has(name) &&
        position &&
        Number.isFinite(position.x) &&
        Number.isFinite(position.y)
      ) {
        defaults[name] = {
          x: position.x,
          y: position.y,
        };
      }
    }
  } catch {
    // Use default positions if saved data is invalid.
  }

  return defaults;
}

const TOP_BAR_HEIGHT = 48;
const DOCK_RESERVED_HEIGHT = 124;
const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;
const SNAP_DISTANCE = 18;

function getDesktopBounds(): Rect {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(
    1,
    window.innerHeight - TOP_BAR_HEIGHT - DOCK_RESERVED_HEIGHT
  );

  return {
    x: 0,
    y: TOP_BAR_HEIGHT,
    width,
    height,
  };
}

function clampWindowPosition(position: Rect): Rect {
  const bounds = getDesktopBounds();
  const width = Math.min(position.width, bounds.width);
  const height = Math.min(position.height, bounds.height);

  return {
    x: Math.max(bounds.x, Math.min(position.x, bounds.width - width)),
    y: Math.max(bounds.y, Math.min(position.y, bounds.y + bounds.height - height)),
    width,
    height,
  };
}

type SystemStatus = {
  batteryPercent: number | null;
  batteryState: string;
  wifiEnabled: boolean | null;
};

function App() {
  const [time, setTime] = useState(new Date());
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    batteryPercent: null,
    batteryState: "Checking…",
    wifiEnabled: null,
  });

  const [startMenu, setStartMenu] = useState(false);
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [zCounter, setZCounter] = useState(1);
  const [search, setSearch] = useState("");
  const [installedApps, setInstalledApps] =
    useState<StoreApp["id"][]>(loadInstalledApps);
  const [desktopContextMenu, setDesktopContextMenu] =
    useState<DesktopContextMenuState>(null);

  useEffect(() => {
    localStorage.setItem(
      "tapas-installed-apps",
      JSON.stringify(installedApps)
    );
  }, [installedApps]);

  // Theme settings
  const [theme, setTheme] = useState(
    () => localStorage.getItem("tapas-theme") || "dark"
  );

  // Wallpaper settings
  const [wallpaper, setWallpaper] = useState(
    () => localStorage.getItem("tapas-wallpaper") || "midnight"
  );

  const [browserLaunchRequest, setBrowserLaunchRequest] = useState<{
    id: number;
    url: string;
    title: string;
  } | null>(null);

  const [openFolderRequest, setOpenFolderRequest] = useState<{
    id: number;
    path: string;
  } | null>(null);

  const [desktopPositions, setDesktopPositions] = useState<
    Record<AppName, DesktopIconPosition>
  >(() => loadDesktopPositions());

  const desktopIconsRef = useRef<HTMLDivElement | null>(null);
  const desktopIconDragRef = useRef<DesktopIconDragState | null>(null);

  useEffect(() => {
    localStorage.setItem(
      "tapas-desktop-icon-positions",
      JSON.stringify(desktopPositions)
    );
  }, [desktopPositions]);

  const [desktopOrder, setDesktopOrder] = useState<AppName[]>(
    () => loadAppOrder("tapas-desktop-app-order")
  );
  const [dockOrder, setDockOrder] = useState<AppName[]>(
    () => loadAppOrder("tapas-dock-app-order", false)
  );

  const availableApps = [
    ...APPS,
    ...OPTIONAL_APPS.filter((app) => installedApps.includes(app.name)),
    ...WEB_APPS.filter((app) => installedApps.includes(app.id)).map((app) => ({ name: app.id as AppName, icon: app.icon })),
  ];
  const appOrderDragRef = useRef<{
    source: "desktop" | "dock";
    name: AppName;
  } | null>(null);
  const appOrderClickSuppressedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("tapas-desktop-app-order", JSON.stringify(desktopOrder));
  }, [desktopOrder]);

  useEffect(() => {
    localStorage.setItem("tapas-dock-app-order", JSON.stringify(dockOrder));
  }, [dockOrder]);

  const desktopApps = desktopOrder
    .map((name) => availableApps.find((item) => item.name === name))
    .filter((item): item is (typeof availableApps)[number] => Boolean(item));

  const dockApps = dockOrder
    .map((name) => availableApps.find((item) => item.name === name))
    .filter((item): item is (typeof availableApps)[number] => Boolean(item));

  const installApp = (name: StoreApp["id"]) => {
    setInstalledApps((current) =>
      current.includes(name) ? current : [...current, name]
    );

    setDesktopOrder((current) =>
      current.includes(name) ? current : [...current, name]
    );

    // Put the new icon in the next free grid slot instead of on top of another icon.
    setDesktopPositions((current) => {
      if (current[name]) return current;
      const taken = Object.values(current);
      let index = 0;
      while (
        index < 200 &&
        taken.some((p) => {
          const slot = slotPosition(index);
          return Math.abs(p.x - slot.x) < 60 && Math.abs(p.y - slot.y) < 60;
        })
      ) {
        index += 1;
      }
      return { ...current, [name]: slotPosition(index) };
    });
  };

  const uninstallApp = (name: StoreApp["id"]) => {
    setInstalledApps((current) =>
      current.filter((app) => app !== name)
    );

    setDesktopOrder((current) =>
      current.filter((app) => app !== name)
    );

    setWindows((current) =>
      current.filter((item) => item.name !== name)
    );
  };

  const startAppReorder = (
    source: "desktop" | "dock",
    name: AppName
  ) => {
    appOrderClickSuppressedRef.current = false;
    appOrderDragRef.current = { source, name };
  };

  const startDesktopIconDrag = (
    name: AppName,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (event.button !== 0) return;

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();

    appOrderClickSuppressedRef.current = false;

    desktopIconDragRef.current = {
      name,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const finishAppReorder = (
    target: "desktop" | "dock",
    targetName: AppName
  ) => {
    const drag = appOrderDragRef.current;
    appOrderDragRef.current = null;

    if (!drag || drag.source !== target || drag.name === targetName) return;

    appOrderClickSuppressedRef.current = true;

    const setter = target === "desktop" ? setDesktopOrder : setDockOrder;
    setter((current) => {
      const next = [...current];
      const from = next.indexOf(drag.name);
      const to = next.indexOf(targetName);

      if (from < 0 || to < 0) return current;

      next.splice(from, 1);
      next.splice(to, 0, drag.name);
      return next;
    });
  };

  const handleAppClick = (name: AppName) => {
    if (appOrderClickSuppressedRef.current) {
      appOrderClickSuppressedRef.current = false;
      return;
    }

    openApp(name);
  };

  useEffect(() => {
    const handleGlobalPointerUp = (event: PointerEvent) => {
      const drag = appOrderDragRef.current;
      if (!drag) return;

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = element?.closest<HTMLElement>("[data-app-reorder]");

      const targetSource = target?.dataset.appSource;
      const targetName = target?.dataset.appName as AppName | undefined;

      if (
        target &&
        targetName &&
        targetSource === drag.source
      ) {
        finishAppReorder(drag.source, targetName);
      } else {
        appOrderDragRef.current = null;
      }
    };

    const handleGlobalPointerCancel = () => {
      appOrderDragRef.current = null;
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerCancel);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerCancel);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = desktopIconDragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) return;

      if (
        !drag.moved &&
        Math.hypot(
          event.clientX - drag.startX,
          event.clientY - drag.startY
        ) < 4
      ) {
        return;
      }

      drag.moved = true;

      const container = desktopIconsRef.current;
      if (!container) return;

      const bounds = container.getBoundingClientRect();

      const x = Math.max(
        0,
        Math.min(
          bounds.width - 92,
          event.clientX - bounds.left - drag.offsetX
        )
      );

      const y = Math.max(
        0,
        Math.min(
          bounds.height - 96,
          event.clientY - bounds.top - drag.offsetY
        )
      );

      setDesktopPositions((current) => ({
        ...current,
        [drag.name]: { x, y },
      }));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = desktopIconDragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) return;

      if (drag.moved) {
        appOrderClickSuppressedRef.current = true;
      }

      desktopIconDragRef.current = null;
    };

    const handlePointerCancel = () => {
      desktopIconDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, []);

  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  // Keep open windows inside the available desktop area after resizing.
  useEffect(() => {
    const handleViewportResize = () => {
      const bounds = getDesktopBounds();

      setWindows((current) =>
        current.map((w) => {
          if (w.layout === "maximized") {
            return { ...w, position: bounds };
          }

          if (w.layout === "left" || w.layout === "right") {
            const halfWidth = Math.floor(bounds.width / 2);
            return {
              ...w,
              position: {
                x: w.layout === "left" ? 0 : halfWidth,
                y: bounds.y,
                width: w.layout === "left" ? halfWidth : bounds.width - halfWidth,
                height: bounds.height,
              },
              restorePosition: w.restorePosition
                ? clampWindowPosition(w.restorePosition)
                : null,
            };
          }

          return {
            ...w,
            position: clampWindowPosition(w.position),
            restorePosition: w.restorePosition
              ? clampWindowPosition(w.restorePosition)
              : null,
          };
        })
      );
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem("tapas-theme", theme);
    } catch (error) {
      console.error("Unable to save theme:", error);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("tapas-wallpaper", wallpaper);
    } catch (error) {
      console.error("Unable to save wallpaper:", error);
      window.alert(
        "Could not save this wallpaper. Please choose a smaller image."
      );
    }
  }, [wallpaper]);

  // Live clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Read real macOS battery and Wi-Fi state through the Tauri backend.
  useEffect(() => {
    let active = true;

    const refreshSystemStatus = async () => {
      if (!isDesktop()) return;
      try {
        const status = await platformInvoke<SystemStatus>("get_system_status");
        if (active) setSystemStatus(status);
      } catch (error) {
        console.error("Unable to read system status:", error);
      }
    };

    void refreshSystemStatus();
    const timer = window.setInterval(() => void refreshSystemStatus(), 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  // Escape closes launcher
  useEffect(() => {
    if (!startMenu) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeStartMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [startMenu]);

  const closeStartMenu = () => {
    setStartMenu(false);
    setSearch("");
  };

  const toggleStartMenu = () => {
    setStartMenu((prev) => !prev);
    setSearch("");
  };

  // Focus window
  const focusWindow = (name: AppName) => {
    const nextZ = zCounter + 1;
    setZCounter(nextZ);

    setWindows((prev) =>
      prev.map((w) =>
        w.name === name ? { ...w, z: nextZ } : w
      )
    );
  };

  // Open or restore application
  const openApp = (name: AppName) => {
    const storeWebApp = WEB_APPS.find((app) => app.id === name);
    const targetName: AppName = (name === "Sicily AI" || storeWebApp) ? "Browser" : name;

    if (name === "Sicily AI" || storeWebApp) {
      const url = storeWebApp?.url ?? "https://sicily-ai.vercel.app/";
      // Keep web-app launches inside the TAPAS Browser in both editions.
      // The web edition uses an iframe and clearly reports sites that refuse embedding.
      setBrowserLaunchRequest({ id: Date.now(), url, title: storeWebApp?.id ?? "Sicily AI" });
    }

    const nextZ = zCounter + 1;
    setZCounter(nextZ);

    setWindows((prev) => {
      const existing = prev.some((w) => w.name === targetName);

      if (existing) {
        return prev.map((w) =>
          w.name === targetName
            ? { ...w, minimized: false, z: nextZ }
            : w
        );
      }

      const floatingWidth = Math.min(650, window.innerWidth - 24);
      const floatingHeight = Math.min(500, window.innerHeight - 160);

      const floatingPosition: Rect = {
        x: Math.max(10, (window.innerWidth - floatingWidth) / 2),
        y: Math.max(
          TOP_BAR_HEIGHT + 10,
          (window.innerHeight - floatingHeight) / 2
        ),
        width: floatingWidth,
        height: floatingHeight,
      };

      return [
        ...prev,
        {
          name: targetName,
          minimized: false,
          z: nextZ,
          position: getDesktopBounds(),
          restorePosition: floatingPosition,
          layout: "maximized",
        },
      ];
    });

    closeStartMenu();
  };

  // Close window
  const closeWindow = (name: AppName) => {
    setWindows((prev) =>
      prev.filter((w) => w.name !== name)
    );
  };

  // Minimize window
  const minimizeWindow = (name: AppName) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.name === name
          ? { ...w, minimized: true }
          : w
      )
    );
  };

  // Check whether app is open
  const isOpen = (name: AppName) =>
    windows.some((w) => w.name === name);

  // Maximize and restore
  const toggleMaximize = (name: AppName) => {
    const bounds = getDesktopBounds();

    setWindows((prev) =>
      prev.map((w) => {
        if (w.name !== name) return w;

        if (w.layout !== "normal") {
          return {
            ...w,
            position: w.restorePosition ?? w.position,
            restorePosition: null,
            layout: "normal",
          };
        }

        return {
          ...w,
          restorePosition: { ...w.position },
          position: bounds,
          layout: "maximized",
        };
      })
    );
  };

  // Snap left or right
  const snapWindow = (
    name: AppName,
    side: "left" | "right"
  ) => {
    const bounds = getDesktopBounds();
    const halfWidth = Math.floor(bounds.width / 2);

    setWindows((prev) =>
      prev.map((w) => {
        if (w.name !== name) return w;

        const position: Rect = {
          x: side === "left" ? 0 : halfWidth,
          y: bounds.y,
          width: halfWidth,
          height: bounds.height,
        };

        return {
          ...w,
          restorePosition:
            w.restorePosition ?? { ...w.position },
          position,
          layout: side,
        };
      })
    );
  };

  // Start dragging
  const startDragging = (
    e: ReactPointerEvent<HTMLDivElement>,
    w: OpenWindow
  ) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (w.layout !== "normal") return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      name: w.name,
      offsetX: e.clientX - w.position.x,
      offsetY: e.clientY - w.position.y,
    };
  };

  // Move window
  const dragWindow = (
    e: ReactPointerEvent<HTMLDivElement>,
    name: AppName
  ) => {
    const drag = dragRef.current;

    if (!drag || drag.name !== name) return;

    setWindows((prev) =>
      prev.map((w) => {
        if (w.name !== name || w.layout !== "normal") {
          return w;
        }

        const maxX = Math.max(
          0,
          window.innerWidth - w.position.width
        );

        const bounds = getDesktopBounds();
        const maxY = Math.max(
          bounds.y,
          bounds.y + bounds.height - 44
        );

        return {
          ...w,
          position: {
            ...w.position,
            x: Math.max(
              0,
              Math.min(e.clientX - drag.offsetX, maxX)
            ),
            y: Math.max(
              TOP_BAR_HEIGHT,
              Math.min(e.clientY - drag.offsetY, maxY)
            ),
          },
        };
      })
    );
  };

  // Stop dragging
  const stopDragging = () => {
    dragRef.current = null;
  };

  // Automatic edge snapping
  const finishDragging = (
    e: ReactPointerEvent<HTMLDivElement>
  ) => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag) return;

    const current = windows.find(
      (w) => w.name === drag.name
    );

    if (!current || current.layout !== "normal") return;

    if (e.clientY <= TOP_BAR_HEIGHT + SNAP_DISTANCE) {
      toggleMaximize(drag.name);
      return;
    }

    if (e.clientX <= SNAP_DISTANCE) {
      snapWindow(drag.name, "left");
      return;
    }

    if (
      e.clientX >= window.innerWidth - SNAP_DISTANCE
    ) {
      snapWindow(drag.name, "right");
    }
  };

  // Start resizing
  const startResize = (
    e: ReactPointerEvent<HTMLDivElement>,
    w: OpenWindow,
    direction: ResizeDirection
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (w.layout !== "normal") return;

    e.currentTarget.setPointerCapture(e.pointerId);

    resizeRef.current = {
      name: w.name,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      original: { ...w.position },
    };

    focusWindow(w.name);
  };

  // Resize window
  const resizeWindow = (
    e: ReactPointerEvent<HTMLDivElement>
  ) => {
    const resize = resizeRef.current;

    if (!resize) return;

    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;

    const { original, direction, name } = resize;

    let x = original.x;
    let y = original.y;
    let width = original.width;
    let height = original.height;

    if (direction.includes("e")) {
      width = Math.max(
        Math.min(MIN_WIDTH, window.innerWidth),
        original.width + dx
      );
    }

    if (direction.includes("s")) {
      height = Math.max(
        Math.min(MIN_HEIGHT, getDesktopBounds().height),
        original.height + dy
      );
    }

    if (direction.includes("w")) {
      const newWidth = Math.max(
        Math.min(MIN_WIDTH, window.innerWidth),
        original.width - dx
      );

      x = original.x + original.width - newWidth;
      width = newWidth;
    }

    if (direction.includes("n")) {
      const newHeight = Math.max(
        Math.min(MIN_HEIGHT, getDesktopBounds().height),
        original.height - dy
      );

      y = original.y + original.height - newHeight;
      height = newHeight;
    }

    const bounds = getDesktopBounds();

    width = Math.min(width, bounds.width);
    height = Math.min(height, bounds.height);

    x = Math.max(0, Math.min(x, bounds.width - width));
    y = Math.max(
      bounds.y,
      Math.min(y, bounds.y + bounds.height - height)
    );

    setWindows((prev) =>
      prev.map((w) =>
        w.name === name
          ? {
              ...w,
              position: { x, y, width, height },
            }
          : w
      )
    );
  };

  const stopResize = () => {
    resizeRef.current = null;
  };

  // Open a folder in the My Files application from TAPAS AI
  const openFolderInMyFiles = (path: string) => {
    setOpenFolderRequest({ id: Date.now(), path });
    openApp("My Files");
  };

  // The native browser view is drawn above all HTML, so it must be hidden
  // whenever anything else should appear on top of it.
  const topVisibleZ = Math.max(0, ...windows.filter((w) => !w.minimized).map((w) => w.z));
  const browserWindow = windows.find((w) => w.name === "Browser");
  const browserVisible =
    !!browserWindow &&
    !browserWindow.minimized &&
    browserWindow.z === topVisibleZ &&
    !startMenu &&
    !controlCenterOpen;

  // Render application content
  const renderContent = (name: AppName) => {
    // My Files application
    if (name === "My Files") {
      return (
        <MyFiles
          openRequest={openFolderRequest}
          onRequestHandled={() => setOpenFolderRequest(null)}
        />
      );
    }

    // Browser application
    if (name === "Browser") {
      return <Browser launchRequest={browserLaunchRequest} visible={browserVisible} />;
    }

    // Settings application
    if (name === "Settings") {
      return (
        <Settings
          theme={theme}
          setTheme={setTheme}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
        />
      );
    }

    // TAPAS AI desktop agent. Sicily AI routing remains unchanged.
    if (name === "AI") {
      return (
        <TapasAI
          onOpenApp={(appName) => openApp(appName as AppName)}
          onOpenFolder={openFolderInMyFiles}
        />
      );
    }

    if (name === "App Store") {
      return (
        <AppStore
          installedApps={installedApps}
          onInstall={installApp}
          onUninstall={uninstallApp}
          onOpen={(app) => openApp(app.id as AppName)}
        />
      );
    }

    if (name === "Notes") return <Notes />;
    if (name === "Calculator") return <Calculator />;
    if (name === "Gallery") return <Gallery />;

    // Other applications
    return (
      <>
        <h2>{name}</h2>

        <p>
          This application is part of TAPAS OS.
        </p>

        <p className="coming-soon">
          COMING SOON
        </p>
      </>
    );
  };

  const resizeDirections: ResizeDirection[] = [
    "n",
    "s",
    "e",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
  ];

  return (
    <main
      className={`desktop theme-${theme} ${
        wallpaper.startsWith("data:image/")
          ? "wallpaper-custom"
          : `wallpaper-${wallpaper}`
      }`}
      style={
        wallpaper.startsWith("data:image/")
          ? {
              backgroundImage: `url("${wallpaper}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >

      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">T</div>

          <span className="brand-name">
            TAPAS OS
          </span>

          <span className="topbar-divider">/</span>

          <span className="system-label">
            Desktop
          </span>
        </div>

        <div className="topbar-right">
          <span className="system-indicator" title="Wi-Fi status">
            {systemStatus.wifiEnabled === null
              ? "Wi-Fi —"
              : systemStatus.wifiEnabled
                ? "Wi-Fi"
                : "Wi-Fi Off"}
          </span>
          <span className="system-indicator" title="Battery status">
            ◒ {systemStatus.batteryPercent === null
              ? "—%"
              : `${systemStatus.batteryPercent}%`}
          </span>
          <button
            className={`control-center-trigger ${controlCenterOpen ? "active" : ""}`}
            onClick={() => setControlCenterOpen((open) => !open)}
            aria-label="Open Control Center"
            aria-expanded={controlCenterOpen}
            title="Control Center"
          >
            <span className="control-center-glyph">☷</span>
          </button>
          <span className="topbar-date">
            {time.toLocaleDateString([], {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })}
          </span>
          <span className="topbar-time">
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </header>

      {controlCenterOpen && (
        <>
          <button
            className="control-center-backdrop"
            aria-label="Close Control Center"
            onClick={() => setControlCenterOpen(false)}
          />
          <section className="control-center" aria-label="TAPAS Control Center">
            <div className="control-center-heading">
              <div>
                <p className="control-center-eyebrow">SYSTEM CONTROLS</p>
                <h2>Control Center</h2>
              </div>
              <button
                className="control-center-close"
                onClick={() => setControlCenterOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="control-center-grid">
              <div className="control-tile">
                <span className="control-tile-icon">◉</span>
                <div>
                  <strong>Wi-Fi</strong>
                  <small>
                    {systemStatus.wifiEnabled === null
                      ? "Status unavailable"
                      : systemStatus.wifiEnabled
                        ? "Enabled"
                        : "Disabled"}
                  </small>
                </div>
              </div>
              <div className="control-tile">
                <span className="control-tile-icon">ᛒ</span>
                <div>
                  <strong>Bluetooth</strong>
                  <small>Manage in macOS Settings</small>
                </div>
              </div>
              <div className="control-tile">
                <span className="control-tile-icon">✈</span>
                <div>
                  <strong>Airplane Mode</strong>
                  <small>Not available on macOS</small>
                </div>
              </div>
              <div className="control-tile battery-tile">
                <span className="control-tile-icon">▰</span>
                <div>
                  <strong>Battery</strong>
                  <small>
                    {systemStatus.batteryPercent === null
                      ? "Status unavailable"
                      : `${systemStatus.batteryPercent}% · ${systemStatus.batteryState}`}
                  </small>
                </div>
              </div>
            </div>

            <div className="control-info-card">
              <div className="control-info-row">
                <span>Display brightness</span>
                <span className="control-muted">Use macOS controls</span>
              </div>
              <div className="control-info-row">
                <span>Sound</span>
                <span className="control-muted">Use macOS controls</span>
              </div>
            </div>

            <div className="control-center-footer">
              <span>{time.toLocaleDateString([], {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}</span>
              <strong>{time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}</strong>
            </div>
          </section>
        </>
      )}

      {/* Desktop */}
      <section className="desktop-content">
        <div className="desktop-heading">
          <p className="welcome-label">
            YOUR PERSONAL SPACE
          </p>

          <h1>Good day.</h1>

          <p className="welcome-subtitle">
            Welcome to your TAPAS environment.
          </p>
        </div>

        {/* Desktop Icons */}
        <div className="desktop-icons" ref={desktopIconsRef}>
          {desktopApps.map((app) => (
            <button
              className="desktop-icon"
              key={app.name}
              data-app-reorder="true"
              data-app-source="desktop"
              data-app-name={app.name}
              style={{
                left: desktopPositions[app.name]?.x ?? 24,
                top: desktopPositions[app.name]?.y ?? 40,
              }}
              onPointerDown={(event) =>
                startDesktopIconDrag(app.name, event)
              }
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const menuWidth = 190;
                const menuHeight = 92;
                setDesktopContextMenu({
                  x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
                  y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
                  appName: app.name,
                });
              }}
              onClick={() => handleAppClick(app.name)}
            >
              <AppIcon name={app.name} />

              <span>{app.name}</span>
            </button>
          ))}
        </div>

        {desktopContextMenu && (
          <>
            <button
              className="desktop-context-dismiss"
              aria-label="Close app menu"
              onClick={() => setDesktopContextMenu(null)}
            />
            <div
              className="desktop-context-menu"
              style={{ left: desktopContextMenu.x, top: desktopContextMenu.y }}
              role="menu"
              onContextMenu={(event) => event.preventDefault()}
            >
              <div className="desktop-context-title">{desktopContextMenu.appName}</div>
              <button
                role="menuitem"
                className="desktop-context-item"
                onClick={() => {
                  handleAppClick(desktopContextMenu.appName);
                  setDesktopContextMenu(null);
                }}
              >
                Open
              </button>
              {installedApps.includes(desktopContextMenu.appName as StoreApp["id"]) ? (
                <button
                  role="menuitem"
                  className="desktop-context-item danger"
                  onClick={() => {
                    const appName = desktopContextMenu.appName as StoreApp["id"];
                    setDesktopContextMenu(null);
                    if (window.confirm(`Uninstall ${appName} from TAPAS OS?`)) {
                      uninstallApp(appName);
                    }
                  }}
                >
                  Uninstall
                </button>
              ) : (
                <div className="desktop-context-hint">Built-in app · Cannot uninstall</div>
              )}
            </div>
          </>
        )}

        {/* AI Widget */}
        <div className="ai-widget">
          <div className="ai-widget-header">
            <div className="ai-symbol">✦</div>

            <div>
              <p className="ai-title">AI</p>

              <p className="ai-status">
                Your intelligent assistant
              </p>
            </div>

            <span className="online-indicator" />
          </div>

          <h2>
            How can I help you today?
          </h2>

          <button
            className="ai-open-button"
            onClick={() => openApp("AI")}
          >
            Open AI <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      {/* Dock */}
      <footer className="dock-container">
        <div className="dock">
          <button
            className="dock-item launcher"
            onClick={toggleStartMenu}
            title="App Launcher"
            aria-label="App Launcher"
            aria-expanded={startMenu}
          >
            <span className="dock-launcher-icon">◈</span>
            <span className="dock-item-label">Apps</span>
          </button>

          <div className="dock-divider" />

          {dockApps.map((app) => (
            <button
              className={`dock-item ${
                isOpen(app.name) ? "running" : ""
              }`}
              key={app.name}
              data-app-reorder="true"
              data-app-source="dock"
              data-app-name={app.name}
              onPointerDown={(event) => {
                if (event.button === 0) startAppReorder("dock", app.name);
              }}
              onClick={() => handleAppClick(app.name)}
              title={app.name}
              aria-label={app.name}
            >
              <AppIcon name={app.name} />
              <span className="dock-item-label">{app.name}</span>
            </button>
          ))}
        </div>
      </footer>

      {/* Start Menu */}
      {startMenu && (
        <>
          <div
            className="start-backdrop"
            onClick={closeStartMenu}
          />

          <div
            className="start-menu"
            role="dialog"
            aria-label="Applications"
          >
            <div className="start-menu-header">
              <div className="brand-mark">T</div>
              <span>TAPAS OS</span>
            </div>

            <input
              className="start-search"
              placeholder="Search apps..."
              aria-label="Search apps"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <p className="menu-section-title">
              APPLICATIONS
            </p>

            <div className="start-app-grid">
              {availableApps.filter((app) =>
                app.name
                  .toLowerCase()
                  .includes(search.toLowerCase())
              ).map((app) => (
                <button
                  className="start-app"
                  key={app.name}
                  onClick={() => openApp(app.name)}
                >
                  <AppIcon name={app.name} />
                  {app.name}
                </button>
              ))}
            </div>

            <div className="start-menu-footer">
              <span>Personal Desktop</span>
              <span>Version 0.4</span>
            </div>
          </div>
        </>
      )}

      {/* Application Windows */}
      {windows.map((w) => (
        <div
          className={`app-window ${
            w.layout !== "normal"
              ? "window-arranged"
              : ""
          }`}
          key={w.name}
          style={{
            zIndex: 10 + w.z,
            display: w.minimized ? "none" : "flex",
            top: w.position.y,
            left: w.position.x,
            width: w.position.width,
            height: w.position.height,
          }}
          onPointerDown={() => focusWindow(w.name)}
        >

          {/* Window Header */}
          <div
            className="window-header"
            onPointerDown={(e) => startDragging(e, w)}
            onPointerMove={(e) => dragWindow(e, w.name)}
            onPointerUp={finishDragging}
            onPointerCancel={stopDragging}
            onDoubleClick={(e) => {
              if (
                (e.target as HTMLElement).closest("button")
              ) {
                return;
              }

              toggleMaximize(w.name);
            }}
          >
            <div className="window-controls">
              <button
                className="ctrl-close"
                onClick={() => closeWindow(w.name)}
                aria-label={`Close ${w.name}`}
                title="Close"
              >
                ×
              </button>

              <button
                className="ctrl-min"
                onClick={() => minimizeWindow(w.name)}
                aria-label={`Minimize ${w.name}`}
                title="Minimize"
              >
                −
              </button>

              <button
                className="ctrl-snap"
                onClick={() => snapWindow(w.name, "left")}
                aria-label="Snap left"
                title="Snap Left"
              >
                ◧
              </button>

              <button
                className="ctrl-snap"
                onClick={() => snapWindow(w.name, "right")}
                aria-label="Snap right"
                title="Snap Right"
              >
                ◨
              </button>

              <button
                className="ctrl-max"
                onClick={() => toggleMaximize(w.name)}
                aria-label={
                  w.layout === "normal"
                    ? "Maximize"
                    : "Restore"
                }
                title={
                  w.layout === "normal"
                    ? "Maximize"
                    : "Restore"
                }
              >
                {w.layout === "normal" ? "□" : "❐"}
              </button>
            </div>

            <span>{w.name}</span>

            <span className="window-menu">
              •••
            </span>
          </div>

          {/* Window Content */}
          <div className="window-content">
            {renderContent(w.name)}
          </div>

          {/* Resize Handles */}
          {w.layout === "normal" &&
            resizeDirections.map((direction) => (
              <div
                key={direction}
                className={`resize-handle resize-${direction}`}
                onPointerDown={(e) =>
                  startResize(e, w, direction)
                }
                onPointerMove={resizeWindow}
                onPointerUp={stopResize}
                onPointerCancel={stopResize}
              />
            ))}
        </div>
      ))}
    </main>
  );
}

export default App;
