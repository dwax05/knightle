import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AuthProvider, useAuth } from "./auth";
import { AuthForm } from "./AuthForm";
import { Game } from "./Game";
import { StatsPanel } from "./StatsPanel";
import { Leaderboard } from "./Leaderboard";
import { IconUser, IconPalette, IconBarChart, IconLightning, IconTarget, IconExpand, IconCompress, IconQuestion, IconBackspace, IconGitHub } from "./icons";
import { HelpModal } from "./HelpModal";
import DotField from "./DotField";
import { getDefaultPresetCss } from "./presets";
import { applyTheme } from "./theme-apply";
import { ThemeEditor } from "./ThemeEditor";
import { ProfilePage } from "./ProfilePage";
import type { VersusMode } from "./Versus";

const VersusLobbyModal = lazy(() => import("./Versus").then(m => ({ default: m.VersusLobbyModal })));
const VersusGame = lazy(() => import("./VersusGame").then(m => ({ default: m.VersusGame })));

const NAV_ITEMS = [
  { view: "profile" as const, icon: <IconUser className="w-4 h-4" />, label: "Profile" },
  { view: "theme" as const, icon: <IconPalette className="w-4 h-4" />, label: "Theme" },
];

function HamburgerMenu({ onNavigate, onOpenChange, dropUp = false }: { onNavigate: (view: "theme" | "profile") => void; onOpenChange?: (open: boolean) => void; dropUp?: boolean }) {
  const [open, setOpen] = useState(false);

  function toggle(v: boolean) { setOpen(v); onOpenChange?.(v); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") toggle(false); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function navigate(view: "theme" | "profile") {
    toggle(false);
    onNavigate(view);
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { toggle(!open); (e.currentTarget as HTMLButtonElement).blur(); }}
        aria-label="Menu"
        className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-surface border border-border-app/50 rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"
      >
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "opacity-0 scale-x-0" : ""}`} />
        <span className={`w-5 h-0.5 bg-fg rounded-full transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-10 bg-black/30"
            onClick={() => toggle(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            className={`absolute ${dropUp ? "bottom-full mb-2" : "top-full mt-2"} right-0 min-w-36 bg-surface border border-border-app/50 rounded-xl overflow-hidden z-20 shadow-xl shadow-black/60`}
            initial={{ opacity: 0, scale: 0.95, y: dropUp ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: dropUp ? 6 : -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: dropUp ? "bottom right" : "top right" }}
          >
            {NAV_ITEMS.map((item, i) => (
              <div key={item.view}>
                <button
                  onClick={() => navigate(item.view)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-muted hover:text-fg hover:bg-bg/50 transition-colors duration-150"
                >
                  {item.icon}
                  <span className="tracking-wide">{item.label}</span>
                </button>
                {i < NAV_ITEMS.length - 1 && <div className="h-px bg-border-app/40 mx-3" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsSheet({ refreshKey, onClose }: { refreshKey: number; onClose: () => void }) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.25 }}
            onClick={() => setVisible(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence onExitComplete={onClose}>
        {visible && (
          <motion.div
            key="sheet"
            className="relative bg-surface border-t border-border-app/40 rounded-t-2xl max-h-[80vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center gap-6 p-4 pb-8 shadow-2xl shadow-black/60"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.25, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-1 w-full max-w-md">
              <span className="text-sm font-semibold tracking-widest uppercase text-muted">Stats & Leaderboard</span>
              <button
                onClick={() => setVisible(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted bg-surface border border-border-app/40 shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100 text-lg"
              >
                ✕
              </button>
            </div>
            <StatsPanel refreshKey={refreshKey} />
            <Leaderboard refreshKey={refreshKey} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GitHubStarButton({ bubbleSide = "right" }: { bubbleSide?: "left" | "right" }) {
  const [showBubble, setShowBubble] = useState(false);

  function dismiss() {
    setShowBubble(false);
    localStorage.setItem("ghStarSeen", "1");
  }

  useEffect(() => {
    if (localStorage.getItem("ghStarSeen")) return;
    const onFirstInput = () => setShowBubble(true);
    document.addEventListener("knightle:first-input", onFirstInput);
    return () => document.removeEventListener("knightle:first-input", onFirstInput);
  }, []);

  useEffect(() => {
    if (!showBubble) return;
    const handler = () => dismiss();
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showBubble]);

  const isRight = bubbleSide === "right";

  return (
    <div className="relative">
      <a
        href="https://github.com/dwax05/knightle"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
        onClick={dismiss}
        className="w-10 h-10 flex items-center justify-center bg-surface border border-border-app/50 rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100 text-muted hover:text-fg"
      >
        <IconGitHub className="w-5 h-5" />
      </a>
      <AnimatePresence>
        {showBubble && (
          <motion.button
            onClick={dismiss}
            className={`absolute z-50 ${isRight ? "left-full ml-5" : "right-full mr-5"} top-1/2 -translate-y-1/2 bg-surface border border-border-app/50 rounded-xl px-3 py-2 text-xs font-medium text-fg whitespace-nowrap shadow-lg shadow-black/40 cursor-pointer`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <div className={`absolute ${isRight ? "-left-2 border-l border-b" : "-right-2 border-r border-t"} top-1/2 -translate-y-1/2 w-4 h-4 bg-surface border-border-app/50 rotate-45`} />
            Knightle is open source — star us on GitHub
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function HomescreenPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("homescreenDismissed")) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;
    if (window.innerWidth >= 1024) return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem("homescreenDismissed", "1");
  }

  if (!visible) return null;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const instruction = isIOS
    ? <>Tap the <span className="font-semibold text-fg">Share</span> icon below, then <span className="font-semibold text-fg">"Add to Home Screen"</span></>
    : <>Tap the <span className="font-semibold text-fg">menu (⋮)</span> in your browser, then <span className="font-semibold text-fg">"Add to Home Screen"</span></>;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
      <div className="bg-surface border border-border-app/50 rounded-2xl shadow-2xl shadow-black/60 p-4 pointer-events-auto flex items-start gap-3 animate-slide-up">
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg">Add Knightle to your homescreen</p>
          <p className="text-xs text-muted mt-1">{instruction}</p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-bg/50 transition-colors text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Apply the default preset once on startup for users without a cached or saved theme.
// This makes DEFAULT_PRESET_NAME in presets.ts the live source of truth at runtime.
if (!document.getElementById("user-theme")) {
  applyTheme(getDefaultPresetCss());
}

function GameSkeleton({ mode }: { mode: VersusMode }) {
  return (
    <div className="flex flex-col items-center w-full gap-4">
      <div className="w-full flex items-center gap-2 px-2 lg:px-0 pb-3 border-b border-border-app/40">
        <span className="text-xs font-bold tracking-widest uppercase text-muted">vs</span>
        <span className="flex-1 text-sm invisible">waiting...</span>
        <span className="text-xs invisible">0/6</span>
        <span className="flex items-center gap-1 text-xs ml-auto shrink-0 invisible">
          {mode === "speed" ? <IconLightning className="w-3 h-3" /> : <IconTarget className="w-3 h-3" />}
          {mode === "speed" ? "speed" : "precision"}
        </span>
      </div>
      {/* mirrors Board's outer flex-col gap-4 */}
      <div className="flex flex-col items-center w-full max-w-md gap-4">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }, (_, r) => (
            <div key={r} className="flex gap-1.5">
              {Array.from({ length: 5 }, (_, c) => (
                <div key={c} className="w-14 h-14 sm:w-15 sm:h-15 lg:w-16 lg:h-16 rounded border-2 border-border-app/20" />
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col w-full gap-1.5 sm:gap-2">
          {[10, 9].map((count, i) => (
            <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
              {Array.from({ length: count }, (_, j) => (
                <div key={j} className="flex-1 min-w-8 h-13 sm:h-14 rounded bg-border-app/20" />
              ))}
            </div>
          ))}
          <div className="flex justify-center gap-1 sm:gap-1.5">
            <div className="px-2 sm:px-3 text-xs h-13 sm:h-14 flex items-center justify-center rounded bg-border-app/20 font-semibold uppercase text-transparent select-none">enter</div>
            {Array.from({ length: 7 }, (_, j) => (
              <div key={j} className="flex-1 min-w-8 h-13 sm:h-14 rounded bg-border-app/20" />
            ))}
            <div className="px-2 sm:px-3 h-13 sm:h-14 flex items-center justify-center rounded bg-border-app/20">
              <IconBackspace className="w-5 h-5 opacity-0" />
            </div>
          </div>
        </div>
      </div>
      <div className="min-h-6" />
    </div>
  );
}

function Home() {
  const { reloadTheme } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [versusCode, setVersusCode] = useState<string | null>(() => sessionStorage.getItem("versusCode"));
  const [versusMode, setVersusMode] = useState<VersusMode>(() => (sessionStorage.getItem("versusMode") as VersusMode) ?? "speed");
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"game" | "theme" | "profile">("game");
  const [fullscreen, setFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("seenHelp")) return;
    const t = setTimeout(() => setHelpOpen(true), 1000);
    return () => clearTimeout(t);
  }, []);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    reloadTheme();
  }, [view]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {view === "theme" && <ThemeEditor onClose={() => setView("game")} />}
        {view === "profile" && <ProfilePage onClose={() => setView("game")} />}
        {view === "game" && (
          <div className="max-w-4xl mx-auto px-4 py-6 relative">
            <Suspense fallback={null}>
              <AnimatePresence>
                {lobbyOpen && (
                  <VersusLobbyModal
                    onStart={(code, mode) => { sessionStorage.setItem("versusCode", code); sessionStorage.setItem("versusMode", mode); setVersusCode(code); setVersusMode(mode); setLobbyOpen(false); }}
                    onClose={() => setLobbyOpen(false)}
                  />
                )}
              </AnimatePresence>
            </Suspense>

            {statsOpen && (
              <div className="lg:hidden">
                <StatsSheet refreshKey={refreshKey} onClose={() => setStatsOpen(false)} />
              </div>
            )}

            <AnimatePresence>
              {helpOpen && <HelpModal onClose={() => { localStorage.setItem("seenHelp", "1"); setHelpOpen(false); }} />}
            </AnimatePresence>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-18 items-center lg:items-start justify-center">
              {/* Mobile: game only; desktop: game + side panels */}
              <div className="lg:contents w-full max-w-md flex flex-col gap-4">
                <motion.div
                  layout
                  style={{ borderRadius: fullscreen ? 0 : 16 }}
                  className={fullscreen
                    ? "fixed inset-0 z-40 flex flex-col overflow-hidden bg-surface px-2 pt-3 pb-2"
                    : "flex flex-col items-center w-full lg:w-auto bg-surface border border-border-app/30 overflow-hidden px-1 py-4 lg:p-4 shadow-lg shadow-black/40"
                  }
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={versusCode ?? "solo"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="w-full flex flex-col items-center"
                    >
                      {versusCode ? (
                        <>
                          <div className={`w-full flex items-center justify-between pb-3 border-b border-border-app/40 px-2 lg:px-0 ${fullscreen ? "mb-1" : "mb-4"}`}>
                            <span className="text-sm font-semibold tracking-widest uppercase text-muted">Room {versusCode}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => { sessionStorage.removeItem("versusCode"); sessionStorage.removeItem("versusMode"); sessionStorage.removeItem("versusGuesses"); sessionStorage.removeItem("versusMarks"); setVersusCode(null); (document.activeElement as HTMLElement)?.blur(); }} className="text-sm text-muted hover:text-fg transition">Leave</button>
                              <button
                                onClick={() => setFullscreen((f) => !f)}
                                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
                              >
                                {fullscreen ? <IconCompress className="w-4 h-4" /> : <IconExpand className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <Suspense fallback={<GameSkeleton mode={versusMode} />}><VersusGame code={versusCode} mode={versusMode} fullscreen={fullscreen} onExit={() => { sessionStorage.removeItem("versusCode"); sessionStorage.removeItem("versusMode"); sessionStorage.removeItem("versusGuesses"); sessionStorage.removeItem("versusMarks"); setVersusCode(null); (document.activeElement as HTMLElement)?.blur(); }} /></Suspense>
                        </>
                      ) : (
                        <>
                          <div className="w-full flex items-center justify-between pb-3 border-b border-border-app/40 mb-4 px-2 lg:px-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { setHelpOpen(true); (e.currentTarget as HTMLButtonElement).blur(); }}
                                aria-label="How to play"
                                className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
                              >
                                <IconQuestion className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-semibold tracking-widest uppercase text-muted">Knightle</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { setLobbyOpen(true); import("./VersusGame"); (e.currentTarget as HTMLButtonElement).blur(); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border-app/50 text-xs font-semibold tracking-wide text-fg shadow-[0_2px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"><IconLightning className="w-3 h-3" /> Versus</button>
                              <button
                                onClick={() => setFullscreen((f) => !f)}
                                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg transition"
                              >
                                {fullscreen ? <IconCompress className="w-4 h-4" /> : <IconExpand className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <Game fullscreen={fullscreen} disabled={lobbyOpen || helpOpen || menuOpen} onGameEnd={() => setRefreshKey((k) => k + 1)} />
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* Desktop side panels */}
                <div className="hidden lg:flex flex-col gap-6 w-auto items-stretch">
                  <StatsPanel refreshKey={refreshKey} />
                  <Leaderboard refreshKey={refreshKey} />
                </div>
              </div>
            </div>

            {/* Desktop hamburger + GitHub — top-right */}
            <div className="hidden lg:flex flex-col items-center gap-2 fixed top-4 right-4 z-10">
              <div className="relative z-10">
                <HamburgerMenu onNavigate={setView} onOpenChange={setMenuOpen} />
              </div>
              <GitHubStarButton bubbleSide="left" />
            </div>

            <HomescreenPrompt />

            {/* Mobile GitHub — fixed bottom-left */}
            <AnimatePresence>
              {!fullscreen && (
                <motion.div
                  className="lg:hidden fixed bottom-8 left-4 z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <GitHubStarButton bubbleSide="right" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile FAB cluster — fixed bottom-right */}
            <AnimatePresence>
              {!fullscreen && (
                <motion.div
                  className="lg:hidden fixed bottom-8 right-4 flex gap-2 z-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={() => setStatsOpen(true)}
                    aria-label="Stats & Leaderboard"
                    className="w-10 h-10 flex items-center justify-center bg-surface border border-border-app/50 rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all duration-100"
                  >
                    <IconBarChart className="w-5 h-5" />
                  </button>
                  <HamburgerMenu onNavigate={setView} onOpenChange={setMenuOpen} dropUp />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Home /> : <AuthForm />;
}

function UpdateBanner() {
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) window.location.reload();
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-app/40 rounded-2xl shadow-2xl shadow-black/60 px-6 py-5 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-muted border-t-fg rounded-full animate-spin" />
        <p className="text-sm font-medium text-fg">Updating — back in a moment</p>
      </div>
    </div>
  );
}

function OfflineWatcher() {
  const { offline } = useAuth();
  if (!offline) return null;
  return <UpdateBanner />;
}

export default function App() {
  return (
    <AuthProvider>
      <main>
        <div className="fixed inset-0 bg-bg" style={{ zIndex: -20 }} />
        <div className="fixed inset-0 -z-10">
          <DotField glowColor="transparent" cursorRadius={150} returnSpeed={0.02} />
        </div>
        <AuthGate />
        <OfflineWatcher />
      </main>
    </AuthProvider>
  );
}
