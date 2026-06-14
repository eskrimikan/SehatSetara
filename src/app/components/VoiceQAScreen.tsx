import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, History, Mic, MicOff, MessageCircle, RefreshCcw, Send, ShieldCheck, Sparkles, Stethoscope, User, type LucideIcon } from "lucide-react";
import { apiFetch } from "../api";
import type { ChatConversation, ChatMessage } from "../types";

interface Props {
  authToken: string;
  initialQuery?: string;
  clearQuery?: () => void;
}

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (prompt: string, options?: { model?: string; stream?: boolean }) => Promise<unknown>;
      };
    };
  }
}

const DISCLAIMER = "Informasi ini hanya untuk edukasi dan bukan pengganti diagnosis atau saran medis profesional. Jika ada tanda darurat, segera cari pertolongan medis.";

const faqItems = [
  "Apa gejala demam berdarah?",
  "Cara membuat oralit sendiri",
  "Tekanan darah normal berapa?",
  "Kapan harus ke dokter saat demam?",
  "Pantangan makanan asam urat",
  "Cara mencegah stunting anak",
  "Berapa kadar gula darah normal?",
  "Cara pertolongan pertama luka bakar",
];

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function formatConversationDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Baru saja";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function initialMessages(): ChatMessage[] {
  return [{
    id: 0,
    role: "assistant",
    content: "Selamat datang di SehatSetara! Tanyakan hal seputar kesehatan dalam bentuk teks. Saya akan menjawab secara edukatif dan singkat.\n\n" + DISCLAIMER,
    createdAt: new Date().toISOString(),
  }];
}

function buildSystemPrompt(question: string) {
  return [
    "Anda adalah asisten kesehatan yang hanya menjawab pertanyaan seputar kesehatan dan teks.",
    "Jawab dalam Bahasa Indonesia, singkat, aman, dan edukatif.",
    "Tolak permintaan image generation, video generation, audio generation, coding, atau topik non-kesehatan.",
    "Jangan mengaku sebagai dokter. Jika ada tanda bahaya, sarankan IGD atau bantuan medis darurat.",
    `Pertanyaan pengguna: ${question}`,
  ].join(" ");
}

function normalizeAnswer(output: unknown): string {
  if (typeof output === "string") return output.trim();
  if (output && typeof output === "object") {
    const candidate = output as {
      text?: unknown;
      content?: unknown;
      message?: unknown;
      response?: unknown;
      answer?: unknown;
      result?: unknown;
      data?: unknown;
      choices?: unknown;
    };
    if (typeof candidate.text === "string") return candidate.text.trim();
    if (typeof candidate.content === "string") return candidate.content.trim();
    if (typeof candidate.message === "string") return candidate.message.trim();
    if (typeof candidate.response === "string") return candidate.response.trim();
    if (typeof candidate.answer === "string") return candidate.answer.trim();
    if (typeof candidate.result === "string") return candidate.result.trim();

    const nestedCandidates = [candidate.data, candidate.response, candidate.result];
    for (const nested of nestedCandidates) {
      const nestedText = normalizeAnswer(nested);
      if (nestedText) return nestedText;
    }

    if (Array.isArray(candidate.choices)) {
      for (const choice of candidate.choices) {
        const choiceText = normalizeAnswer(choice);
        if (choiceText) return choiceText;
      }
    }
  }
  return "";
}

function waitForAnswer<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);
    promise.then((value) => {
      if (settled) return;
      if (!normalizeAnswer(value)) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(value);
    }).catch(() => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(null);
    });
  });
}

export default function VoiceQAScreen({ authToken, initialQuery, clearQuery }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) || null;

  async function loadConversations() {
    try {
      const response = await apiFetch("/chat/conversations", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Gagal memuat riwayat percakapan");
      }
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    }
  }

  async function loadConversation(conversationId: number) {
    try {
      setLoading(true);
      const response = await apiFetch(`/chat/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Gagal memuat percakapan");
      }
      const nextMessages = Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : [];
      setActiveConversationId(Number(data.id || conversationId));
      setMessages(nextMessages.length ? nextMessages : initialMessages());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat percakapan");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: trimmed, createdAt: new Date().toISOString() }]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);

    try {
      const puter = window.puter;
      const answerRaw = puter?.ai?.chat
        ? await waitForAnswer(puter.ai.chat(buildSystemPrompt(trimmed), { model: "gpt-5.4-nano" }), 55000)
        : null;
      const answer = normalizeAnswer(answerRaw);

      const response = await apiFetch("/chat/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          assistantAnswer: answer,
          conversationId: activeConversationId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan percakapan");
      }

      const finalAnswer = answer || String(data.answer || "").trim() || "Maaf, saya sedang bermasalah saat memproses pertanyaan ini.";
      setActiveConversationId(Number(data.conversationId || activeConversationId || 0));
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: finalAnswer, createdAt: new Date().toISOString() }]);
      setError("");
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pertanyaan");
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: "Maaf, saya sedang bermasalah saat memproses pertanyaan ini.", createdAt: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }

  const resetConversation = () => {
    setActiveConversationId(null);
    setMessages(initialMessages());
    setError("");
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Browser Anda tidak mendukung fitur pengenalan suara. Gunakan Chrome atau Edge terbaru.");
      return;
    }
    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognizer = new SR();
    recognizer.lang = "id-ID";
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.onstart = () => setIsListening(true);
    recognizer.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      void sendMessage(transcript);
    };
    recognizer.onend = () => setIsListening(false);
    recognizer.onerror = () => setIsListening(false);
    recognizer.start();
    recognizerRef.current = recognizer;
  };

  useEffect(() => {
    void loadConversations();
  }, [authToken]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      void sendMessage(initialQuery.trim());
      clearQuery?.();
    }
  }, [initialQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="h-full flex flex-col sm:flex-row p-3 sm:p-8 gap-3 sm:gap-6">
      <style>{`
        .reveal-on-scroll { opacity: 1; transform: translateY(0); }
        .chat-bubble-enter { animation: bubblePop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes bubblePop {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="sm:w-72 sm:flex-shrink-0 flex flex-col gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-3 sm:p-5 shadow-sm border border-blue-50 flex sm:flex-col items-center sm:text-center gap-3">
          <button
            onClick={startVoice}
            className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex-shrink-0 flex items-center justify-center transition-all shadow-lg ${isListening ? "animate-pulse scale-110" : "hover:scale-105"}`}
            style={{ background: isListening ? "linear-gradient(135deg, #f84848, #ff7070)" : "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}
          >
            {isListening ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
          </button>
          <div className="flex-1 sm:flex-none">
            <div className="text-[#1a2560] font-semibold text-sm">{isListening ? "Mendengarkan..." : "Tekan & Bicara"}</div>
            <div className="text-[#6b7ab8] text-xs mt-0.5 hidden sm:block">Tanya dengan suara dalam Bahasa Indonesia</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-blue-50 flex flex-col gap-3 max-h-[300px] sm:max-h-[340px] overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History size={14} className="text-[#5b74f5]" />
              <span className="text-[#1a2560] text-sm font-semibold">Riwayat percakapan</span>
            </div>
            <button onClick={() => setHistoryOpen((v) => !v)} className="sm:hidden text-[#5b74f5]">
              {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          <div className={`space-y-2 overflow-y-auto pr-1 ${historyOpen ? "block" : "hidden sm:block"}`}>
            {conversations.length === 0 ? (
              <div className="text-xs text-[#6b7ab8]">Belum ada percakapan tersimpan.</div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => void loadConversation(conversation.id)}
                  className={`w-full text-left rounded-2xl p-3 border transition-colors ${conversation.id === activeConversation?.id ? "bg-[#edf2fd] border-[#5b74f5]" : "bg-[#fbfdff] border-blue-50 hover:bg-[#edf2fd]"}`}
                >
                  <div className="text-[#1a2560] text-xs font-semibold line-clamp-1">{conversation.title}</div>
                  <div className="text-[#6b7ab8] text-[11px] mt-1">{formatConversationDate(conversation.updatedAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-blue-50 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <MessageCircle size={14} className="text-[#5b74f5]" />
            <span className="text-[#1a2560] text-sm font-semibold">FAQ / Pertanyaan Populer</span>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1">
            {faqItems.map((q) => (
              <button key={q} onClick={() => void sendMessage(q)} className="w-full text-left rounded-2xl p-3 bg-[#edf2fd] hover:bg-[#dce8fc] border border-blue-100 transition-colors">
                <span className="text-[#1a2560] text-xs leading-snug">{q}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden min-w-0 min-h-0">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-blue-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}>
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[#1a2560] font-semibold text-sm">SehatSetara Assistant</div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <span className="text-emerald-600 text-xs">Siap menjawab</span>
              </div>
            </div>
          </div>
          <button onClick={resetConversation} className="flex items-center gap-1 text-[#b0bef8] hover:text-[#6b7ab8] text-xs sm:text-sm">
            <RefreshCcw size={14} /> <span className="hidden sm:inline">Hapus chat</span>
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-blue-50 bg-[#fbfdff] text-xs sm:text-sm text-[#32406e] flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 text-[#5b74f5] flex-shrink-0" />
          <span>{DISCLAIMER}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex chat-bubble-enter ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2 sm:gap-3`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}>
                  <Stethoscope size={14} className="text-white" />
                </div>
              )}
              <div className={`flex flex-col gap-1 max-w-[80%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.role === "user" ? "text-white rounded-tr-sm" : "text-[#1a2560] rounded-tl-sm"}`} style={msg.role === "user" ? { background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" } : { background: "#edf2fd" }}>
                  {msg.content}
                </div>
                <span className="text-[#b0bef8] text-xs">{formatTime(msg.createdAt)}</span>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#edf2fd" }}>
                  <User size={14} className="text-[#5b74f5]" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3 text-[#6b7ab8] text-sm">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#edf2fd] text-[#5b74f5] flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} />
              </div>
              Sedang memproses jawaban...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-3 sm:mx-5 mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="px-3 sm:px-5 pb-3 sm:pb-5 pt-2 sm:pt-3 border-t border-blue-50 flex-shrink-0">
          <div className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1 flex items-end gap-2 bg-[#edf2fd] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 border border-blue-100">
              <textarea
                ref={inputRef}
                className="flex-1 bg-transparent outline-none text-[#1a2560] placeholder-[#b0bef8] text-sm resize-none overflow-hidden max-h-24"
                placeholder="Ketik pertanyaan kesehatan..."
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
            </div>
            {input.trim() ? (
              <button onClick={() => void sendMessage(input)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 transition-all flex-shrink-0 hover:scale-105" style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}>
                <Send size={16} />
              </button>
            ) : (
              <button onClick={startVoice} className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white transition-all flex-shrink-0 hover:scale-105 ${isListening ? "animate-pulse" : ""}`} style={{ background: isListening ? "#f84848" : "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}>
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
          </div>
          <div className="mt-2 text-[11px] text-[#8ea4f8] flex items-center gap-1">
            <span>Tekan Enter untuk kirim, Shift+Enter untuk baris baru.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
