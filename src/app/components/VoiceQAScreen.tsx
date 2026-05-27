import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, X, MessageCircle, Sparkles, Stethoscope, User, ChevronDown, ChevronUp } from "lucide-react";
import { healthQA } from "./data/medicalData";

interface Message {
  id: number;
  type: "user" | "bot";
  text: string;
  ts: string;
}

interface Props { initialQuery?: string; clearQuery?: () => void; }

const DISCLAIMER = "Informasi ini hanya untuk edukasi dan bukan pengganti diagnosis atau saran medis profesional. Selalu konsultasikan kondisi Anda dengan dokter atau tenaga kesehatan.";

function getAnswer(question: string): string {
  const q = question.toLowerCase();
  const matched = healthQA.find((qa) => qa.keywords.some((kw) => q.includes(kw)));
  if (matched) return matched.answer;
  if (q.includes("terima kasih") || q.includes("makasih")) return "Sama-sama! Jangan ragu bertanya lagi. Semoga selalu sehat!";
  if (q.includes("halo") || q.includes("hai") || q.includes("hello")) return "Halo! Saya SehatSetara, asisten kesehatan Anda. Silakan tanyakan apa saja tentang kesehatan, gejala, pertolongan pertama, atau obat-obatan.";
  if (q.includes("darurat") || q.includes("ambulans") || q.includes("igd")) return "Untuk kondisi darurat, segera hubungi:\nAmbulan/IGD: 119\n\nAtau pergi langsung ke IGD rumah sakit terdekat. Jangan tunda pertolongan medis!";
  return "Maaf, saya belum memiliki informasi spesifik untuk pertanyaan tersebut. Untuk kepastian, konsultasikan langsung dengan dokter atau tenaga kesehatan. Anda juga bisa cek Radar Faskes untuk menemukan fasilitas kesehatan terdekat.";
}

const suggestedQuestions: string[] = [
  "Apa gejala demam berdarah?", "Cara membuat oralit sendiri", "Tekanan darah normal berapa?",
  "Kapan harus ke dokter saat demam?", "Pantangan makanan asam urat", "Cara mencegah stunting anak",
  "Berapa kadar gula darah normal?", "Cara pertolongan pertama luka bakar",
];

export default function VoiceQAScreen({ initialQuery, clearQuery }: Props = {}) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 0, type: "bot",
    text: "Selamat datang di SehatSetara!\n\nSaya siap menjawab pertanyaan Anda seputar kesehatan. Gunakan tombol mikrofon untuk bertanya dengan suara, atau ketik pertanyaan di bawah.\n\n" + DISCLAIMER,
    ts: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  }]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const recogRef  = useRef<any>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll(".reveal-on-scroll");
      elements.forEach((el) => observer.observe(el));
    }
    return () => observer.disconnect();
  }, []);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const ts = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev,
      { id: Date.now(),     type: "user", text: text.trim(),           ts },
      { id: Date.now() + 1, type: "bot",  text: getAnswer(text.trim()), ts },
    ]);
    setInput("");
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.style.height = "auto";
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      sendMessage(initialQuery.trim());
      if (clearQuery) clearQuery();
    }
  }, [initialQuery]);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Browser Anda tidak mendukung fitur pengenalan suara. Gunakan Chrome atau Edge terbaru."); return; }
    if (isListening) { recogRef.current?.stop(); setIsListening(false); return; }
    const r = new SR(); r.lang = "id-ID"; r.continuous = false; r.interimResults = false;
    r.onstart  = () => setIsListening(true);
    r.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); sendMessage(t); };
    r.onend    = () => setIsListening(false);
    r.onerror  = () => setIsListening(false);
    r.start();
    recogRef.current = r;
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col sm:flex-row p-3 sm:p-8 gap-3 sm:gap-6">
      <style>{`
        .reveal-on-scroll { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
        .reveal-on-scroll.is-visible { opacity: 1; transform: translateY(0); }
        .chat-bubble-enter { animation: bubblePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes bubblePop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* LEFT PANEL */}
      <div className="sm:w-72 sm:flex-shrink-0 flex flex-col gap-3 sm:gap-4 reveal-on-scroll is-visible">
        <div className="hidden sm:block">
          <h1 className="text-[#1a2560] text-2xl mb-1">Tanya Jawab</h1>
          <p className="text-[#6b7ab8] text-sm">Asisten kesehatan berbasis suara & teks</p>
        </div>
        <div className="flex sm:flex-col gap-3">
          <div className="flex-1 sm:flex-none bg-white rounded-3xl p-3 sm:p-5 shadow-sm border border-blue-50 flex sm:flex-col items-center sm:text-center gap-3 transition-transform hover:shadow-md">
            <button onClick={startVoice}
              className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex-shrink-0 flex items-center justify-center transition-all shadow-lg ${isListening ? "animate-pulse scale-110" : "hover:scale-105"}`}
              style={{ background: isListening ? "linear-gradient(135deg, #f84848, #ff7070)" : "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}>
              {isListening ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
            </button>
            <div className="flex-1 sm:flex-none">
              <div className="text-[#1a2560] font-semibold text-sm">{isListening ? "Mendengarkan..." : "Tekan & Bicara"}</div>
              <div className="text-[#6b7ab8] text-xs mt-0.5 hidden sm:block">{isListening ? "Ucapkan pertanyaan Anda" : "Tanya dengan suara dalam Bahasa Indonesia"}</div>
            </div>
          </div>
          <button className="sm:hidden flex-shrink-0 bg-white rounded-3xl px-4 py-3 shadow-sm border border-blue-50 flex flex-col items-center justify-center gap-1 min-w-[80px]" onClick={() => setShowSuggestions((v) => !v)}>
            <Sparkles size={18} className="text-[#5b74f5]" /><span className="text-[10px] text-[#6b7ab8] font-medium leading-tight text-center">Pertanyaan<br/>Populer</span>
          </button>
        </div>

        <div className="hidden sm:flex flex-1 bg-white rounded-3xl p-4 shadow-sm border border-blue-50 overflow-y-auto flex-col reveal-on-scroll is-visible" style={{ transitionDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-3"><Sparkles size={14} className="text-[#5b74f5]" /><span className="text-[#1a2560] text-sm font-semibold">Pertanyaan Populer</span></div>
          <div className="space-y-2">
            {suggestedQuestions.map((q) => (
              <button key={q} onClick={() => sendMessage(q)} className="w-full text-left rounded-2xl p-3 bg-[#edf2fd] hover:bg-[#dce8fc] border border-blue-100 transition-colors">
                <span className="text-[#1a2560] text-xs leading-snug">{q}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden min-w-0 min-h-0 reveal-on-scroll is-visible" style={{ transitionDelay: '150ms' }}>
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-blue-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}><MessageCircle size={16} className="text-white" /></div>
            <div><div className="text-[#1a2560] font-semibold text-sm">SehatSetara Assistant</div><div className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /><span className="text-emerald-600 text-xs">Siap menjawab</span></div></div>
          </div>
          {messages.length > 1 && (<button onClick={() => setMessages([{ id: 0, type: "bot", text: "Percakapan dimulai ulang.\n\n" + DISCLAIMER, ts: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }])} className="flex items-center gap-1 text-[#b0bef8] hover:text-[#6b7ab8] text-xs sm:text-sm"><X size={14} /> <span className="hidden sm:inline">Hapus chat</span></button>)}
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex chat-bubble-enter ${msg.type === "user" ? "justify-end" : "justify-start"} gap-2 sm:gap-3`}>
              {msg.type === "bot" && (<div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}><Stethoscope size={14} className="text-white" /></div>)}
              <div className={`flex flex-col gap-1 max-w-[80%] sm:max-w-[75%] ${msg.type === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.type === "user" ? "text-white rounded-tr-sm" : "text-[#1a2560] rounded-tl-sm"}`} style={msg.type === "user" ? { background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" } : { background: "#edf2fd" }}>{msg.text}</div>
                <span className="text-[#b0bef8] text-xs">{msg.ts}</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="px-3 sm:px-5 pb-3 sm:pb-5 pt-2 sm:pt-3 border-t border-blue-50 flex-shrink-0">
          <div className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1 flex items-end gap-2 bg-[#edf2fd] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 border border-blue-100">
              <textarea ref={inputRef} className="flex-1 bg-transparent outline-none text-[#1a2560] placeholder-[#b0bef8] text-sm resize-none overflow-hidden max-h-24" placeholder="Ketik pertanyaan kesehatan..." value={input} rows={1} onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }} />
            </div>
            <button onClick={() => sendMessage(input)} disabled={!input.trim()} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 transition-all flex-shrink-0 hover:scale-105" style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}