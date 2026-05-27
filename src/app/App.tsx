import { useEffect, useRef, useState } from "react";
import { Home, BookOpen, MapPin, Activity, Mic, Stethoscope, Menu, X, Plus, LogIn, UserRound } from "lucide-react";
import HomeScreen, { type Screen } from "./components/HomeScreen";
import MedicalInfoScreen from "./components/MedicalInfoScreen";
import FaskesScreen from "./components/FaskesScreen";
import LifestyleScreen from "./components/LifestyleScreen";
import VoiceQAScreen from "./components/VoiceQAScreen";
import AuthScreen from "./components/AuthScreen";
import ProfileScreen from "./components/ProfileScreen";
import PublishScreen from "./components/PublishScreen";
import type { AppScreen, Article, AuthSession } from "./types";

type MedTab = "penyakit" | "p3k" | "obat";

const navItems: { id: Screen; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Beranda" },
  { id: "medical", icon: BookOpen, label: "Info" },
  { id: "faskes", icon: MapPin, label: "Faskes" },
  { id: "lifestyle", icon: Activity, label: "Lifestyle" },
  { id: "qa", icon: Mic, label: "Tanya" },
];

const SESSION_KEY = "sehatsetara_session";

function normalizeArticles(data: unknown): Article[] {
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    id: Number(item.id || 0),
    title: String(item.title || "Tanpa judul"),
    content: String(item.content || ""),
    authorName: String(item.author_name || item.author_full_name || item.username || "Anonim"),
    authorRole: String(item.author_role || item.role || "pengguna"),
    authorHospital: String(item.author_hospital_name || ""),
    authorProvince: String(item.author_province || ""),
    authorCity: String(item.author_city || ""),
    authorDistrict: String(item.author_district || ""),
    createdAt: String(item.created_at || item.createdAt || ""),
  }));
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [medTab, setMedTab] = useState<MedTab>("penyakit");
  const [qaQuery, setQaQuery] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesError, setArticlesError] = useState("");
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed?.token && parsed?.username) {
        setSession(parsed);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setScrollY(0);
  }, [screen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-navbar]")) setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileMenuOpen]);

  const isDoctor = !!session && ["dokter", "produsen"].includes(session.role);

  const loadArticles = async () => {
    try {
      const response = await fetch("/articles", {
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Gagal memuat artikel");
      }
      setArticles(normalizeArticles(data));
      setArticlesError("");
    } catch (err) {
      setArticles([]);
      setArticlesError(err instanceof Error ? err.message : "Gagal memuat artikel");
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const navigate = (s: AppScreen, payload?: string) => {
    setScreen(s);
    setMobileMenuOpen(false);
    if (s === "medical" && payload) setMedTab(payload as MedTab);
    if (s === "qa" && payload) setQaQuery(payload);
  };

  const progress = screen === "home" ? Math.min(scrollY / 160, 1) : 1;
  const navBg = progress < 0.05 ? "rgba(255,255,255,0.12)" : `rgba(255,255,255,${0.55 + 0.4 * progress})`;
  const navShadow =
    progress < 0.1
      ? `inset 0 0 0 1px rgba(255,255,255,${0.25 * (1 - progress)})`
      : `0 4px 24px rgba(91,116,245,${0.1 + 0.12 * progress}), inset 0 0 0 1px rgba(91,116,245,0.10)`;
  const labelColor = progress > 0.5 ? "#1a2560" : "rgba(255,255,255,0.9)";
  const logoColor = progress > 0.5 ? "#5b74f5" : "rgba(255,255,255,0.9)";

  const onAuthSuccess = (nextSession: AuthSession) => {
    setSession(nextSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setScreen("home");
  };

  const onLogout = () => {
    setSession(null);
    setScreen("home");
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <div className="size-full flex flex-col" style={{ background: "#f0f5ff" }}>
      <header className="fixed top-0 left-0 right-0 z-50 px-3 py-3 sm:px-5 sm:py-4" style={{ pointerEvents: "none" }} data-navbar>
        <div
          className="flex items-center h-11 sm:h-12"
          style={{
            background: navBg,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "9999px",
            boxShadow: navShadow,
            transition: "background 0.4s ease, box-shadow 0.4s ease",
            padding: "0 4px 0 14px",
            pointerEvents: "auto",
          }}
        >
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center"
              style={{ background: progress > 0.5 ? "linear-gradient(135deg,#5b74f5,#7a9bf8)" : "rgba(255,255,255,0.22)" }}
            >
              <Stethoscope size={12} style={{ color: progress > 0.5 ? "#fff" : "rgba(255,255,255,0.95)" }} />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight transition-colors duration-300" style={{ color: logoColor }}>
              SehatSetara
            </span>
          </div>

          <div className="flex-1" />

          <nav className="hidden sm:flex items-center gap-0">
            {navItems.map(({ id, label }) => {
              const active = screen === id;
              return (
                <button
                  key={id}
                  onClick={() => navigate(id)}
                  className="flex flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={
                    active
                      ? {
                          background: progress > 0.5 ? "linear-gradient(135deg,#5b74f5,#7a9bf8)" : "rgba(255,255,255,0.25)",
                          color: "#fff",
                          boxShadow: progress > 0.5 ? "0 2px 12px rgba(91,116,245,0.35)" : "none",
                        }
                      : { color: labelColor }
                  }
                >
                  <span>{label}</span>
                </button>
              );
            })}

            {isDoctor && (
              <button
                onClick={() => navigate("publish")}
                className="flex items-center justify-center w-9 h-9 rounded-full ml-2 transition-all"
                style={
                  screen === "publish"
                    ? { background: "linear-gradient(135deg,#5b74f5,#7a9bf8)", color: "#fff" }
                    : { color: labelColor, background: progress > 0.5 ? "rgba(91,116,245,0.08)" : "rgba(255,255,255,0.15)" }
                }
                aria-label="Tulis artikel"
              >
                <Plus size={16} />
              </button>
            )}

            {!session ? (
              <button
                onClick={() => navigate("auth")}
                className="flex flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ml-2"
                style={
                  screen === "auth"
                    ? {
                        background: progress > 0.5 ? "linear-gradient(135deg,#5b74f5,#7a9bf8)" : "rgba(255,255,255,0.25)",
                        color: "#fff",
                      }
                    : { color: labelColor }
                }
              >
                <LogIn size={14} />
                <span>Login</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("profile")}
                className="flex flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ml-2"
                style={
                  screen === "profile"
                    ? {
                        background: progress > 0.5 ? "linear-gradient(135deg,#5b74f5,#7a9bf8)" : "rgba(255,255,255,0.25)",
                        color: "#fff",
                      }
                    : { color: labelColor }
                }
              >
                <UserRound size={14} />
                <span>Profil</span>
              </button>
            )}
          </nav>

          <button
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
            style={{
              background: mobileMenuOpen ? (progress > 0.5 ? "linear-gradient(135deg,#5b74f5,#7a9bf8)" : "rgba(255,255,255,0.3)") : "transparent",
              color: labelColor,
            }}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="sm:hidden mt-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 8px 32px rgba(91,116,245,0.18), inset 0 0 0 1px rgba(91,116,245,0.10)",
              pointerEvents: "auto",
            }}
          >
            {navItems.map(({ id, icon: Icon, label }) => {
              const active = screen === id;
              return (
                <button
                  key={id}
                  onClick={() => navigate(id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-blue-50"
                  style={{ background: active ? "linear-gradient(135deg,#eef2ff,#dde8fd)" : "transparent", color: active ? "#5b74f5" : "#1a2560" }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: active ? "linear-gradient(135deg,#5b74f5,#7a9bf8)" : "#edf2fd" }}>
                    <Icon size={16} style={{ color: active ? "#fff" : "#5b74f5" }} />
                  </div>
                  <span className="font-medium text-sm">{label}</span>
                </button>
              );
            })}

            {isDoctor && (
              <button
                onClick={() => navigate("publish")}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-blue-50"
                style={{ background: screen === "publish" ? "linear-gradient(135deg,#eef2ff,#dde8fd)" : "transparent", color: screen === "publish" ? "#5b74f5" : "#1a2560" }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#edf2fd]">
                  <Plus size={16} />
                </div>
                <span className="font-medium text-sm">Tulis Artikel</span>
              </button>
            )}

            {!session ? (
              <button
                onClick={() => navigate("auth")}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ background: screen === "auth" ? "linear-gradient(135deg,#eef2ff,#dde8fd)" : "transparent", color: screen === "auth" ? "#5b74f5" : "#1a2560" }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#edf2fd]">
                  <LogIn size={16} />
                </div>
                <span className="font-medium text-sm">Login</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("profile")}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ background: screen === "profile" ? "linear-gradient(135deg,#eef2ff,#dde8fd)" : "transparent", color: screen === "profile" ? "#5b74f5" : "#1a2560" }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#edf2fd]">
                  <UserRound size={16} />
                </div>
                <span className="font-medium text-sm">Profil</span>
              </button>
            )}
          </div>
        )}
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto min-h-0">
        {screen === "home" && <HomeScreen onNavigate={(s, tab) => navigate(s, tab)} articles={articles} articleError={articlesError} />}
        {screen !== "home" && (
          <div className="h-full flex flex-col pt-14 sm:pt-16">
            {screen === "medical" && <MedicalInfoScreen initialTab={medTab} />}
            {screen === "faskes" && <FaskesScreen />}
            {screen === "lifestyle" && <LifestyleScreen />}
            {screen === "qa" && <VoiceQAScreen initialQuery={qaQuery} clearQuery={() => setQaQuery("")} />}
            {screen === "auth" && <AuthScreen onAuthSuccess={onAuthSuccess} />}
            {screen === "profile" && session && <ProfileScreen auth={session} onLogout={onLogout} />}
            {screen === "profile" && !session && <AuthScreen onAuthSuccess={onAuthSuccess} />}
            {screen === "publish" && session && isDoctor && <PublishScreen token={session.token} onPublished={loadArticles} />}
            {screen === "publish" && (!session || !isDoctor) && <AuthScreen onAuthSuccess={onAuthSuccess} />}
          </div>
        )}
      </main>
    </div>
  );
}
