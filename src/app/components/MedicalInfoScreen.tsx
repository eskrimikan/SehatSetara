import { useState, useEffect, useRef } from "react";
import { Search, Mic, MicOff, X, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle, Info, Shield, AlertCircle as AlertCircleIcon, ClipboardList, Bandage, Pill } from "lucide-react";
import { diseases, firstAidItems, medications, type Disease, type FirstAid, type Medication, type Severity } from "./data/medicalData";
import { MedIcon } from "./MedIcon";

type Tab = "penyakit" | "p3k" | "obat";

interface Props { initialTab?: Tab; }

const severityConfig: Record<Severity, { label: string; color: string; bg: string; dot: string }> = {
  ringan: { label: "Ringan", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", dot: "bg-emerald-400" },
  sedang: { label: "Sedang", color: "text-amber-700",   bg: "bg-amber-50 border-amber-100",     dot: "bg-amber-400"   },
  berat:  { label: "Serius", color: "text-[#f84848]",   bg: "bg-red-50 border-red-100",         dot: "bg-[#f84848]"   },
};

const tabs: { id: Tab; label: string }[] = [
  { id: "penyakit", label: "Penyakit"           },
  { id: "p3k",      label: "Pertolongan Pertama" },
  { id: "obat",     label: "Obat-obatan"         },
];

function SectionCard({ icon, title, colorClass, children }: { icon: React.ReactNode; title: string; colorClass: string; children: React.ReactNode }) {
  return (
    <div className={`border rounded-2xl p-4 ${colorClass} reveal-on-scroll`}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-[#1a2560] font-semibold text-sm">{title}</span></div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

export default function MedicalInfoScreen({ initialTab = "penyakit" }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [selectedFirstAid, setSelectedFirstAid] = useState<FirstAid | null>(null);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Efek Scroll Reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });

    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll(".reveal-on-scroll");
      elements.forEach((el) => observer.observe(el));
    }
    return () => observer.disconnect();
  }, [activeTab, mobileView, selectedDisease, selectedFirstAid, selectedMed]);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => {
    setSelectedDisease(null); setSelectedFirstAid(null); setSelectedMed(null);
    setMobileView("list");
  }, [activeTab]);

  const q = query.toLowerCase();
  const filteredDiseases  = diseases.filter((d) => d.name.toLowerCase().includes(q) || d.symptoms.some((s) => s.toLowerCase().includes(q)));
  const filteredFirstAid  = firstAidItems.filter((f) => f.name.toLowerCase().includes(q));
  const filteredMeds      = medications.filter((m) => m.name.toLowerCase().includes(q) || m.uses.some((u) => u.toLowerCase().includes(q)));

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Browser Anda tidak mendukung fitur suara.");
    const r = new SR(); r.lang = "id-ID";
    r.onstart = () => setIsListening(true);
    r.onresult = (e: any) => setQuery(e.results[0][0].transcript);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.start();
  };

  const hasDetail = selectedDisease || selectedFirstAid || selectedMed;

  const selectItem = (cb: () => void) => {
    cb();
    setMobileView("detail");
  };

  const DetailContent = () => (
    <>
      {!hasDetail && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 reveal-on-scroll">
          <div className="w-20 h-20 rounded-3xl bg-[#edf2fd] flex items-center justify-center mb-4">
            {activeTab === "penyakit" ? <ClipboardList size={32} className="text-[#5b74f5]" /> :
             activeTab === "p3k"      ? <Bandage       size={32} className="text-[#f84848]" /> :
                                       <Pill           size={32} className="text-violet-500" />}
          </div>
          <h3 className="text-[#1a2560] text-lg mb-2">
            {activeTab === "penyakit" ? "Pilih penyakit untuk melihat detail" : activeTab === "p3k" ? "Pilih situasi darurat" : "Pilih obat untuk melihat informasi"}
          </h3>
          <p className="text-[#6b7ab8] text-sm max-w-xs">Pilih salah satu item dari daftar untuk melihat panduan lengkap.</p>
        </div>
      )}

      {selectedDisease && (
        <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-blue-50 reveal-on-scroll">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#edf2fd] flex items-center justify-center flex-shrink-0">
              <MedIcon name={selectedDisease.icon} size={28} className="text-[#5b74f5]" />
            </div>
            <div>
              <h2 className="text-[#1a2560] text-lg sm:text-xl">{selectedDisease.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${severityConfig[selectedDisease.severity].dot}`} />
                <span className={`text-sm font-medium ${severityConfig[selectedDisease.severity].color}`}>
                  Tingkat Keparahan: {severityConfig[selectedDisease.severity].label}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[#6b7ab8] text-sm leading-relaxed reveal-on-scroll">{selectedDisease.description}</p>
          <SectionCard icon={<AlertTriangle size={15} className="text-amber-500" />} title="Gejala Utama" colorClass="bg-amber-50 border-amber-100">
            {selectedDisease.symptoms.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[#1a2560] text-sm"><span className="text-amber-400 mt-1 flex-shrink-0">•</span> {s}</li>
            ))}
          </SectionCard>
          <SectionCard icon={<Shield size={15} className="text-[#5b74f5]" />} title="Cara Pencegahan" colorClass="bg-[#edf2fd] border-blue-100">
            {selectedDisease.prevention.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-[#1a2560] text-sm"><CheckCircle size={13} className="text-[#5b74f5] flex-shrink-0 mt-0.5" /> {p}</li>
            ))}
          </SectionCard>
          <SectionCard icon={<CheckCircle size={15} className="text-emerald-500" />} title="Penanganan di Rumah" colorClass="bg-emerald-50 border-emerald-100">
            {selectedDisease.treatment.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[#1a2560] text-sm"><span className="text-emerald-400 mt-1 flex-shrink-0">•</span> {t}</li>
            ))}
          </SectionCard>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 reveal-on-scroll">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={15} className="text-[#f84848]" /><span className="text-[#f84848] font-semibold text-sm">Kapan Harus ke Dokter</span></div>
            <p className="text-red-700 text-sm leading-relaxed">{selectedDisease.emergency}</p>
          </div>
        </div>
      )}

      {selectedFirstAid && (
        <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-blue-50 reveal-on-scroll">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <MedIcon name={selectedFirstAid.icon} size={28} className="text-[#f84848]" />
            </div>
            <div>
              <h2 className="text-[#1a2560] text-lg sm:text-xl">{selectedFirstAid.name}</h2>
              {selectedFirstAid.callAmbulance && (
                <div className="mt-1.5 bg-[#f84848] text-white text-xs px-3 py-1 rounded-full font-medium inline-flex items-center gap-1">
                  <AlertTriangle size={11} /> Hubungi 119 Segera
                </div>
              )}
            </div>
          </div>
          {selectedFirstAid.callAmbulance && (
            <div className="rounded-2xl p-4 flex items-center gap-3 reveal-on-scroll" style={{ background: "linear-gradient(135deg, #f84848, #ff7070)" }}>
              <AlertCircleIcon size={28} className="text-white flex-shrink-0" />
              <div className="text-white"><div className="font-bold">HUBUNGI 119 SEGERA</div><div className="text-white/80 text-sm">Sambil melakukan langkah berikut ini</div></div>
            </div>
          )}
          <div className="bg-white border border-blue-100 rounded-2xl p-4 reveal-on-scroll">
            <h3 className="text-[#1a2560] font-semibold mb-3 text-sm">Langkah-langkah Penanganan</h3>
            <ol className="space-y-3">
              {selectedFirstAid.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                    style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}>{i + 1}</span>
                  <span className="text-[#1a2560] text-sm leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 reveal-on-scroll">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={15} className="text-amber-500" /><span className="text-amber-800 font-semibold text-sm">Pantangan — Jangan Lakukan</span></div>
            <ul className="space-y-2">{selectedFirstAid.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-amber-800 text-sm"><X size={13} className="text-[#f84848] flex-shrink-0 mt-0.5" /> {w}</li>
            ))}</ul>
          </div>
        </div>
      )}

      {selectedMed && (
        <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-blue-50 reveal-on-scroll">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#edf2fd] flex items-center justify-center flex-shrink-0">
              <MedIcon name={selectedMed.icon} size={28} className="text-[#5b74f5]" />
            </div>
            <div><h2 className="text-[#1a2560] text-lg sm:text-xl">{selectedMed.name}</h2><p className="text-[#6b7ab8] text-sm mt-0.5">{selectedMed.genericName}</p></div>
          </div>
          <SectionCard icon={<Info size={15} className="text-[#5b74f5]" />} title="Kegunaan Obat" colorClass="bg-[#edf2fd] border-blue-100">
            {selectedMed.uses.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-[#1a2560] text-sm"><CheckCircle size={13} className="text-[#5b74f5] flex-shrink-0 mt-0.5" /> {u}</li>
            ))}
          </SectionCard>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 reveal-on-scroll">
            <div className="text-emerald-700 font-semibold text-sm mb-2 flex items-center gap-2"><Info size={14} /> Aturan Dosis</div>
            <p className="text-emerald-800 text-sm leading-relaxed">{selectedMed.dosage}</p>
          </div>
          <SectionCard icon={<Info size={15} className="text-amber-500" />} title="Efek Samping Umum" colorClass="bg-amber-50 border-amber-100">
            {selectedMed.sideEffects.map((se, i) => (
              <li key={i} className="flex items-start gap-2 text-[#1a2560] text-sm"><span className="text-amber-400 mt-1 flex-shrink-0">•</span> {se}</li>
            ))}
          </SectionCard>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 reveal-on-scroll">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={15} className="text-[#f84848]" /><span className="text-[#f84848] font-semibold text-sm">Perhatian Penting</span></div>
            <p className="text-red-700 text-sm leading-relaxed">{selectedMed.warnings}</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .reveal-on-scroll.is-visible { opacity: 1; transform: translateY(0); }
        .card-lift { transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
        .card-lift:hover { transform: translateY(-2px); }
      `}</style>

      {/* Top bar */}
      <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-3 sm:pb-5 flex-shrink-0 reveal-on-scroll is-visible">
        <h1 className="text-[#1a2560] text-2xl sm:text-3xl mb-3 sm:mb-4">Informasi Medis</h1>

        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-blue-100 shadow-sm mb-3">
          <Search size={18} className="text-[#b0bef8] flex-shrink-0" />
          <input className="flex-1 bg-transparent outline-none text-[#1a2560] placeholder-[#b0bef8] text-sm"
            placeholder="Cari penyakit, gejala, obat..." value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery("")}><X size={15} className="text-[#b0bef8]" /></button>}
          <button onClick={startVoice}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isListening ? "bg-[#f84848] text-white animate-pulse" : "bg-[#edf2fd] text-[#5b74f5]"}`}>
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all ${activeTab === t.id ? "text-white shadow-md" : "bg-white text-[#6b7ab8] border border-blue-100"}`}
              style={activeTab === t.id ? { background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE */}
      <div className="sm:hidden flex-1 min-h-0 flex flex-col px-4 pb-4">
        {mobileView === "list" ? (
          <div className="flex-1 min-h-0 bg-white rounded-3xl border border-blue-50 shadow-sm flex flex-col overflow-hidden reveal-on-scroll is-visible">
            {activeTab === "p3k" && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2 flex-shrink-0">
                <AlertTriangle size={13} className="text-[#f84848] flex-shrink-0" />
                <p className="text-[#f84848] text-xs">Bukan pengganti pertolongan medis profesional.</p>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "penyakit" && (filteredDiseases.map((d, i) => {
                const s = severityConfig[d.severity];
                return (
                  <button key={d.id} onClick={() => selectItem(() => setSelectedDisease(d))}
                    className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-blue-50 text-left card-lift active:bg-[#edf2fd] reveal-on-scroll" style={{ transitionDelay: `${i * 50}ms` }}>
                    <div className="w-9 h-9 rounded-xl bg-[#edf2fd] flex items-center justify-center flex-shrink-0"><MedIcon name={d.icon} size={18} className="text-[#5b74f5]" /></div>
                    <div className="flex-1 min-w-0"><div className="text-[#1a2560] text-sm font-medium">{d.name}</div><div className="text-[#6b7ab8] text-xs truncate mt-0.5">{d.symptoms[0]}</div></div>
                    <ChevronRight size={13} className="text-[#b0bef8]" />
                  </button>
                );
              }))}
              {activeTab === "p3k" && (filteredFirstAid.map((f, i) => (
                <button key={f.id} onClick={() => selectItem(() => setSelectedFirstAid(f))}
                  className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-blue-50 text-left card-lift active:bg-[#edf2fd] reveal-on-scroll" style={{ transitionDelay: `${i * 50}ms` }}>
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0"><MedIcon name={f.icon} size={18} className="text-[#f84848]" /></div>
                  <div className="flex-1 min-w-0"><div className="text-[#1a2560] text-sm font-medium">{f.name}</div><div className="text-[#6b7ab8] text-xs mt-0.5">{f.steps.length} langkah</div></div>
                  <ChevronRight size={13} className="text-[#b0bef8]" />
                </button>
              )))}
              {activeTab === "obat" && (filteredMeds.map((m, i) => (
                <button key={m.id} onClick={() => selectItem(() => setSelectedMed(m))}
                  className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-blue-50 text-left card-lift active:bg-[#edf2fd] reveal-on-scroll" style={{ transitionDelay: `${i * 50}ms` }}>
                  <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0"><MedIcon name={m.icon} size={18} className="text-violet-500" /></div>
                  <div className="flex-1 min-w-0"><div className="text-[#1a2560] text-sm font-medium">{m.name}</div><div className="text-[#6b7ab8] text-xs truncate mt-0.5">{m.uses.slice(0, 2).join(", ")}</div></div>
                  <ChevronRight size={13} className="text-[#b0bef8]" />
                </button>
              )))}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 bg-white rounded-3xl border border-blue-50 shadow-sm flex flex-col overflow-hidden reveal-on-scroll is-visible">
            <button onClick={() => setMobileView("list")} className="flex items-center gap-2 px-4 py-3 border-b border-blue-50 text-[#5b74f5] text-sm font-medium flex-shrink-0">
              <ChevronLeft size={16} /> Kembali ke daftar
            </button>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col"><DetailContent /></div>
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:flex flex-1 min-h-0 gap-0 px-8 pb-8">
        <div className="w-80 flex-shrink-0 bg-white rounded-3xl border border-blue-50 shadow-sm flex flex-col overflow-hidden reveal-on-scroll is-visible">
          <div className="flex-1 overflow-y-auto">
            {activeTab === "penyakit" && (filteredDiseases.map((d, i) => {
              const s = severityConfig[d.severity];
              return (
                <button key={d.id} onClick={() => setSelectedDisease(d)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3 border-b border-blue-50 text-left card-lift ${selectedDisease?.id === d.id ? "bg-[#edf2fd]" : "hover:bg-gray-50"} reveal-on-scroll`} style={{ transitionDelay: `${i * 30}ms` }}>
                  <div className="w-9 h-9 rounded-xl bg-[#edf2fd] flex items-center justify-center flex-shrink-0"><MedIcon name={d.icon} size={18} className="text-[#5b74f5]" /></div>
                  <div className="flex-1 min-w-0"><div className="text-[#1a2560] text-sm font-medium">{d.name}</div><div className="text-[#6b7ab8] text-xs truncate mt-0.5">{d.symptoms[0]}</div></div>
                </button>
              );
            }))}
            {activeTab === "p3k" && (filteredFirstAid.map((f, i) => (
              <button key={f.id} onClick={() => setSelectedFirstAid(f)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 border-b border-blue-50 text-left card-lift ${selectedFirstAid?.id === f.id ? "bg-[#edf2fd]" : "hover:bg-gray-50"} reveal-on-scroll`} style={{ transitionDelay: `${i * 30}ms` }}>
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0"><MedIcon name={f.icon} size={18} className="text-[#f84848]" /></div>
                <div className="flex-1 min-w-0"><div className="text-[#1a2560] text-sm font-medium">{f.name}</div><div className="text-[#6b7ab8] text-xs mt-0.5">{f.steps.length} langkah</div></div>
              </button>
            )))}
            {activeTab === "obat" && (filteredMeds.map((m, i) => (
              <button key={m.id} onClick={() => setSelectedMed(m)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 border-b border-blue-50 text-left card-lift ${selectedMed?.id === m.id ? "bg-[#edf2fd]" : "hover:bg-gray-50"} reveal-on-scroll`} style={{ transitionDelay: `${i * 30}ms` }}>
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0"><MedIcon name={m.icon} size={18} className="text-violet-500" /></div>
                <div className="flex-1 min-w-0"><div className="text-[#1a2560] text-sm font-medium">{m.name}</div><div className="text-[#6b7ab8] text-xs truncate mt-0.5">{m.uses.slice(0, 2).join(", ")}</div></div>
              </button>
            )))}
          </div>
        </div>
        <div className="flex-1 ml-5 bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden flex flex-col reveal-on-scroll is-visible" style={{ transitionDelay: "150ms" }}>
          <DetailContent />
        </div>
      </div>
    </div>
  );
}