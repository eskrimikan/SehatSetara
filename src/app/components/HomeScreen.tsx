import { useState, useRef, useEffect } from "react";
import {
  AlertCircle, MapPin, Activity, Mic, ChevronRight, Sun,
  Heart, ClipboardList, Bandage, Pill, Building2, BookOpen, X,
  Leaf, Droplets, Moon, Flame, Shield, Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import heroImg from "../../imports/image-5.png";
import type { Article } from "../types";
import { rewriteApiMediaUrls } from "../api";

export type Screen = "home" | "medical" | "faskes" | "lifestyle" | "qa" | "dashboard";

interface Props {
  onNavigate: (screen: Screen, tab?: string) => void;
  articles?: Article[];
  articleError?: string;
  dailyTip?: { title: string; desc: string };
}

interface HealthTip {
  icon: LucideIcon;
  title: string;
  desc: string;
}

function htmlToText(html: string) {
  return html
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>(\n)?/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const healthTips: HealthTip[] = [
  { icon: Droplets, title: "Cuci Tangan 6 Langkah",          desc: "Cuci tangan dengan sabun minimal 20 detik dapat mencegah 80% penyakit menular umum." },
  { icon: Droplets, title: "Minum 8 Gelas Air Sehari",        desc: "Konsumsi 2 liter air putih per hari menjaga fungsi ginjal, kulit, dan konsentrasi Anda." },
  { icon: Leaf,     title: "Makan Sayur & Buah Setiap Hari",  desc: "Setengah piring sayur dan buah memenuhi kebutuhan vitamin, mineral, dan serat harian." },
  { icon: Moon,     title: "Tidur 7–8 Jam Per Malam",         desc: "Tidur cukup meningkatkan imunitas dan membantu tubuh memperbaiki sel-sel yang rusak." },
  { icon: Activity, title: "Aktif Bergerak 30 Menit",          desc: "Jalan kaki 30 menit per hari menurunkan risiko penyakit jantung, diabetes, dan depresi." },
];

const emergencyNumbers = [
  { name: "Ambulans / IGD",   number: "119", icon: AlertCircle, color: "bg-[#fff5f5] border-[#ffdcdc]", text: "text-[#f84848]" },
  { name: "Pemadam Kebakaran", number: "113", icon: Flame,       color: "bg-[#fff7f0] border-[#ffe5cc]", text: "text-orange-500" },
  { name: "Polisi",            number: "110", icon: Shield,      color: "bg-[#f0f4ff] border-[#d0dbfd]", text: "text-[#5b74f5]" },
];

const quickActions = [
  { screen: "medical"   as Screen, tab: "penyakit", icon: ClipboardList, label: "Info Penyakit",       sublabel: "10+ panduan lengkap"   },
  { screen: "medical"   as Screen, tab: "p3k",      icon: Bandage,       label: "Pertolongan Pertama", sublabel: "Panduan darurat cepat"  },
  { screen: "faskes"    as Screen, tab: undefined,  icon: MapPin,        label: "Faskes Terdekat",     sublabel: "Peta & kontak"          },
  { screen: "lifestyle" as Screen, tab: undefined,  icon: Leaf,          label: "Gaya Hidup",          sublabel: "Lacak kebiasaanmu"      },
];

const stats = [
  { label: "Penyakit terdokumentasi", value: "10+", sub: "Info lengkap offline",        icon: ClipboardList },
  { label: "Panduan P3K",             value: "8",   sub: "Langkah terstruktur",         icon: Bandage       },
  { label: "Obat-obatan",             value: "10",  sub: "Dosis & peringatan lengkap",  icon: Pill          },
  { label: "Faskes terdekat",         value: "7",   sub: "Peta & kontak darurat",        icon: Building2     },
];

export default function HomeScreen({ onNavigate, articles = [], articleError, dailyTip }: Props) {
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const recogRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const now     = new Date();
  const hour    = now.getHours();
  const greeting = hour < 12 ? "Selamat Pagi" : hour < 17 ? "Selamat Siang" : "Selamat Malam";
  const dayName  = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const todayTip = dailyTip || healthTips[new Date().getDay() % healthTips.length];
  const TipIcon  = dailyTip ? Sun : todayTip.icon;
  const featuredArticles = articles.slice(0, 4);

  // === EFEK SCROLL REVEAL (Intersection Observer) ===
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // Cukup animasi sekali aja
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" } // Trigger animasi pas elemen masuk layar sedikit
    );

    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll(".reveal-on-scroll");
      elements.forEach((el) => observer.observe(el));
    }

    return () => observer.disconnect();
  }, []);

  const submitChat = () => {
    if (chatInput.trim()) {
      onNavigate("qa", chatInput.trim());
      setChatInput("");
    } else {
      onNavigate("qa");
    }
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Browser Anda tidak mendukung fitur pengenalan suara. Gunakan Chrome atau Safari terbaru."); return; }
    if (isListening) { recogRef.current?.stop(); setIsListening(false); return; }
    const r = new SR();
    r.lang = "id-ID"; r.continuous = false; r.interimResults = false;
    r.onstart  = () => setIsListening(true);
    r.onresult = (e: any) => { const transcript = e.results[0][0].transcript; setChatInput(transcript); };
    r.onend    = () => setIsListening(false);
    r.onerror  = () => setIsListening(false);
    r.start();
    recogRef.current = r;
  };

  return (
    <div ref={containerRef} className="min-h-full" style={{ background: "linear-gradient(160deg,#eef3fd 0%,#f5f8ff 40%,#e8f0fd 100%)" }}>
      {/* ── CSS Animasi Smooth ── */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float-1 { animation: float-slow 4s ease-in-out infinite; }
        .animate-float-2 { animation: float-delay 5s ease-in-out infinite; animation-delay: 2s; }

        /* Animasi Text Hero Pertama Load */
        @keyframes fadeInUpHero {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-hero-1 { opacity: 0; animation: fadeInUpHero 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-hero-2 { opacity: 0; animation: fadeInUpHero 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s forwards; }
        .animate-hero-3 { opacity: 0; animation: fadeInUpHero 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s forwards; }

        /* Animasi Scroll Reveal Elemen Bawah */
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(35px);
          transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .reveal-on-scroll.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Animated gradient untuk card tips */
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes text-gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .greeting-gradient {
          background: linear-gradient(90deg, #ffffff, #ddeeff, #ffffff, #e8f4ff, #ffffff);
          background-size: 300% 300%;
          animation: text-gradient-shift 5s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .tip-card-gradient {
          background: linear-gradient(135deg, #fffdf0, #ffffff, #fefce8, #ffffff, #fffdf0);
          background-size: 300% 300%;
          animation: gradient-shift 6s ease infinite;
        }

        .card-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(91,116,245,0.12);
        }
      `}</style>

      {/* ── Hero Responsif ── */}
      <div className="w-full pt-4 px-4 pb-4 box-border h-[520px] md:h-[751px]">
        <div className="relative w-full h-full md:h-[725px] rounded-3xl overflow-hidden flex items-center justify-center">
          <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />

          {/* Bottom blue gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#edf2fd80] via-50% to-[#5b74f5]" />

          {/* Bubble 1: Kiri, ikon Hati */}
          <div className="absolute top-[22%] left-[12%] animate-float-1 z-10 hidden sm:block">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/20 blur-3xl rounded-full" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+2px)] w-[110px] h-[110px] bg-white/10 border border-white/20 rounded-full backdrop-blur-md" />
             <div className="relative z-10 w-[80px] h-[84px] flex items-center justify-center" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.12))' }}>
               <svg className="absolute inset-0 w-full h-full -scale-x-100" viewBox="0 0 100 104" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M50 0C77.6142 0 100 22.3858 100 50C100 61.3433 96.2208 71.8028 89.8551 80.1921C88.7019 81.7119 88 83.5416 88 85.4493V101.063C88 102.474 86.5797 103.441 85.2675 102.924L71.6374 97.5595C69.7337 96.8102 67.6244 96.8462 65.6818 97.4878C60.7495 99.1166 55.4781 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0Z" fill="#ffffff"/>
               </svg>
               <Heart size={32} className="text-[#f84848] relative z-20 mb-1" />
             </div>
          </div>

          {/* Bubble 2: Kanan, ikon Obat */}
          <div className="absolute top-[67%] right-[12%] animate-float-2 z-10 hidden sm:block">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-white/15 blur-3xl rounded-full" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+2px)] w-[130px] h-[130px] bg-white/10 border border-white/20 rounded-full backdrop-blur-md" />
             <div className="relative z-10 w-[100px] h-[104px] flex items-center justify-center" style={{ filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.15))' }}>
               <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 104" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M50 0C77.6142 0 100 22.3858 100 50C100 61.3433 96.2208 71.8028 89.8551 80.1921C88.7019 81.7119 88 83.5416 88 85.4493V101.063C88 102.474 86.5797 103.441 85.2675 102.924L71.6374 97.5595C69.7337 96.8102 67.6244 96.8462 65.6818 97.4878C60.7495 99.1166 55.4781 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0Z" fill="#ffffff"/>
               </svg>
               <Pill size={44} className="text-[#5b74f5] relative z-20 mb-1" />
             </div>
          </div>

          {/* Centered text + chat bar */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 md:px-8 pb-8 md:pb-10 z-20">
            <div className="animate-hero-1">
              <p className="text-white/75 text-sm md:text-base mb-2 [text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">{dayName}</p>
              <h1 className="greeting-gradient mb-2 text-[clamp(2rem,6vw,3.75rem)] font-bold leading-[1.1]">
                {greeting}!
              </h1>
            </div>
            
            <div className="animate-hero-2">
              <p className="text-white/85 mb-8 md:mb-10 text-sm md:text-[clamp(1rem,2.2vw,1.35rem)] [text-shadow:0_1px_10px_rgba(0,0,0,0.35)]">
                Selamat datang di SehatSetara
              </p>
            </div>

            {/* Gemini-style chat bar */}
            <div className="w-full max-w-2xl animate-hero-3">
              <div className="flex items-center gap-2 md:gap-3 rounded-full px-3 py-2.5 bg-[rgba(237,242,253,0.30)] backdrop-blur-xl border border-[#FFFFFF2E] shadow-[0_4px_32px_rgba(0,0,0,0.2)]">
                <input
                  type="text"
                  className="chat-bar-input flex-1 bg-transparent outline-none text-white text-sm pl-2 min-w-0"
                  style={{ caretColor: "#7a9bf8" }}
                  placeholder={isListening ? "Mendengarkan..." : "Ketik keluhan Anda..."}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && chatInput.trim()) submitChat(); }}
                />
                {chatInput.trim() ? (
                  <button
                    onClick={submitChat}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}
                  >
                    <Send size={16} className="text-white" />
                  </button>
                ) : (
                  <button
                    onClick={startVoice}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isListening ? "animate-pulse" : ""}`}
                    style={{ background: isListening ? "#f84848" : "rgba(255,255,255,0.12)" }}
                  >
                    <Mic size={18} className={isListening ? "text-white" : "text-white/80"} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT SECTION Responsif & Animated ── */}
      <div className="px-5 pb-8 pt-2 overflow-hidden">

        {/* Emergency + Health Tip row */}
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 mb-5">

          {/* Left: Emergency */}
          <div className="lg:col-span-2 flex flex-col gap-3 reveal-on-scroll">
            <button
              onClick={() => onNavigate("medical", "p3k")}
              className="w-full rounded-[20px] p-4 flex items-center gap-3 text-left card-lift"
              style={{
                background: "linear-gradient(135deg, #f84848 0%, #fc7373 100%)",
                boxShadow: "0 4px 20px rgba(248,72,72,0.28)",
              }}
            >
              <div className="w-12 h-12 bg-white/20 rounded-[14px] flex items-center justify-center flex-shrink-0">
                <AlertCircle size={26} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-base leading-tight">Darurat & P3K</div>
                <div className="text-white/75 text-xs mt-0.5 leading-snug">Panduan pertolongan pertama cepat</div>
              </div>
              <ChevronRight size={18} className="text-white/70 flex-shrink-0" />
            </button>

            <div
              className="rounded-[20px] p-4 flex-1"
              style={{
                background: "rgba(255,255,255,0.80)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(91,116,245,0.08)",
                boxShadow: "0 2px 16px rgba(91,116,245,0.06)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Heart size={13} className="text-[#f84848]" />
                <span className="text-[#1a2560] text-xs font-semibold">Nomor Darurat</span>
              </div>
              <div className="space-y-2">
                {emergencyNumbers.map((e) => {
                  const EIcon = e.icon;
                  return (
                    <a key={e.number} href={`tel:${e.number}`}
                      className={`flex items-center gap-2.5 border rounded-[12px] px-3 py-2 ${e.color} transition-opacity active:opacity-70`}>
                      <EIcon size={15} className={`${e.text} flex-shrink-0`} />
                      <span className="text-[#1a2560] text-xs flex-1">{e.name}</span>
                      <span className={`font-bold text-base ${e.text}`}>{e.number}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Health Tip */}
          <div className="lg:col-span-3 reveal-on-scroll" style={{ transitionDelay: '100ms' }}>
            <div
              className="tip-card-gradient rounded-[20px] p-5 h-full flex flex-col"
              style={{
                border: "1px solid rgba(91,116,245,0.08)",
                boxShadow: "0 2px 20px rgba(91,116,245,0.07)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sun size={15} className="text-amber-500" />
                <span className="text-[#6b7ab8] text-xs font-semibold tracking-wide uppercase">Tips Kesehatan Hari Ini</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div
                  className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #fff8e1, #fef3c7)",
                    border: "1px solid rgba(251,191,36,0.20)",
                  }}
                >
                  <TipIcon size={26} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-[#1a2560] text-base font-semibold mb-1.5 leading-snug">{todayTip.title}</h3>
                  <p className="text-[#6b7ab8] text-sm leading-relaxed">{todayTip.desc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h2 className="text-[#1a2560] text-base font-semibold mb-3 px-0.5 reveal-on-scroll">Akses Cepat</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <div key={i} className="reveal-on-scroll h-full" style={{ transitionDelay: `${i * 100}ms` }}>
                  <button
                    onClick={() => onNavigate(action.screen, action.tab)}
                    className="w-full h-full rounded-[20px] p-4 flex flex-col items-start gap-3 text-left card-lift"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(91,116,245,0.08)",
                      boxShadow: "0 2px 12px rgba(91,116,245,0.06)",
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-[13px] flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #eef2ff, #dde8fd)" }}
                    >
                      <Icon size={20} style={{ color: "#5b74f5" }} />
                    </div>
                    <div>
                      <div className="text-[#1a2560] text-sm font-semibold leading-snug">{action.label}</div>
                      <div className="text-[#6b7ab8] text-xs mt-0.5">{action.sublabel}</div>
                    </div>
                    <div
                      className="mt-auto flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1"
                      style={{ background: "linear-gradient(135deg,#eef2ff,#dde8fd)", color: "#5b74f5" }}
                    >
                      Buka <ChevronRight size={11} />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Container */}
        <div className="mt-2 reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
          <div
            className="rounded-[24px] p-5"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(220,233,252,0.75) 100%)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(91,116,245,0.10)",
              boxShadow: "0 4px 24px rgba(91,116,245,0.08)",
            }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 lg:gap-4 lg:divide-x divide-blue-200/50">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className={`flex flex-col items-center text-center px-1 lg:px-3 ${i === 0 ? "lg:pl-0" : ""} ${i === 3 ? "lg:pr-0" : ""}`}
                  >
                    <div
                      className="w-11 h-11 rounded-[13px] flex items-center justify-center mb-2.5"
                      style={{
                        background: "rgba(255,255,255,0.85)",
                        border: "1px solid rgba(91,116,245,0.10)",
                        boxShadow: "0 2px 8px rgba(91,116,245,0.08)",
                      }}
                    >
                      <Icon size={20} style={{ color: "#5b74f5" }} />
                    </div>
                    <div className="text-[#1a2560] font-bold text-xl md:text-2xl leading-tight">{s.value}</div>
                    <div className="text-[#6b7ab8] text-[11px] font-semibold mt-1 leading-snug">{s.label}</div>
                    <div className="text-[#5b74f5] text-[9px] md:text-[10px] font-medium mt-0.5">{s.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 reveal-on-scroll" style={{ transitionDelay: '300ms' }}>
          <div className="flex items-center justify-between gap-3 mb-3 px-0.5">
            <div>
              <h2 className="text-[#1a2560] text-base font-semibold">Info Kesehatan</h2>
              <p className="text-[#6b7ab8] text-xs mt-1">Artikel kesehatan dari dokter yang sudah login</p>
            </div>
            <div className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "linear-gradient(135deg,#eef2ff,#dde8fd)", color: "#5b74f5" }}>
              {featuredArticles.length} artikel
            </div>
          </div>

          {articleError && (
            <div className="mb-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {articleError}
            </div>
          )}

          {featuredArticles.length === 0 ? (
            <div className="rounded-[20px] p-5 bg-white/85 border border-blue-100 shadow-sm text-sm text-[#6b7ab8]">
              Belum ada artikel kesehatan yang dipublikasikan.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {featuredArticles.map((article) => {
                const plainPreview = htmlToText(article.content) || (/<(img|video|iframe|embed|object)\b/i.test(article.content) ? "Artikel berisi media" : "");
                const preview = plainPreview.length > 130 ? `${plainPreview.slice(0, 130).trim()}...` : plainPreview;
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="text-left rounded-[20px] p-4 bg-white/90 border border-blue-100 shadow-sm card-lift flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#eef2ff,#dde8fd)" }}>
                        <BookOpen size={20} style={{ color: "#5b74f5" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold mb-2" style={{ background: "rgba(91,116,245,0.08)", color: "#5b74f5" }}>
                          Artikel Dokter
                        </div>
                        <h3 className="text-[#1a2560] text-sm font-semibold leading-snug line-clamp-2">{article.title}</h3>
                      </div>
                      <ChevronRight size={16} className="text-[#8ea4f8] flex-shrink-0 mt-1" />
                    </div>

                    <p className="text-[#6b7ab8] text-xs leading-relaxed line-clamp-3">{preview}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6b7ab8]">
                      <span className="font-semibold text-[#1a2560]">{article.authorName}</span>
                      {article.authorHospital && <span>• {article.authorHospital}</span>}
                      {article.createdAt && <span>• {article.createdAt.slice(0, 10)}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {selectedArticle && (
        <div className="fixed inset-0 z-[80] bg-[#0f1735]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl border border-blue-100 overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-blue-50">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold mb-3" style={{ background: "rgba(91,116,245,0.08)", color: "#5b74f5" }}>
                  <BookOpen size={12} />
                  Artikel Kesehatan
                </div>
                <h3 className="text-[#1a2560] text-xl sm:text-2xl font-semibold leading-tight">{selectedArticle.title}</h3>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#edf2fd] text-[#5b74f5] flex-shrink-0"
                aria-label="Tutup artikel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-wrap gap-2 text-xs text-[#6b7ab8]">
                <span className="rounded-full px-3 py-1 bg-[#edf2fd] text-[#5b74f5] font-semibold">{selectedArticle.authorName}</span>
                {selectedArticle.authorHospital && <span className="rounded-full px-3 py-1 bg-blue-50">{selectedArticle.authorHospital}</span>}
                {selectedArticle.authorDistrict && <span className="rounded-full px-3 py-1 bg-blue-50">{selectedArticle.authorDistrict}</span>}
              </div>

              <div className="article-content text-sm leading-7 text-[#32406e]" dangerouslySetInnerHTML={{ __html: rewriteApiMediaUrls(selectedArticle.content) }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .article-content :is(p, ul, ol, blockquote) {
          margin-bottom: 1rem;
        }
        .article-content :is(h1, h2, h3) {
          color: #1a2560;
          font-weight: 700;
          margin: 1.25rem 0 0.75rem;
        }
        .article-content h2 {
          font-size: 1.35rem;
          line-height: 1.25;
        }
        .article-content a {
          color: #5b74f5;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .article-content img,
        .article-content video {
          width: 100%;
          max-width: 100%;
          border-radius: 20px;
          margin: 1rem 0;
          box-shadow: 0 12px 35px rgba(91, 116, 245, 0.12);
        }
      `}</style>
    </div>
  );
}