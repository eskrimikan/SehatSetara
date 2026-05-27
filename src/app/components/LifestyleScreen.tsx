import { useState, useEffect } from "react";
import { CheckCircle, Circle, Plus, Minus, Flame, Trophy, Leaf, Moon, Pill, Ban, Coffee, GlassWater, Hand, Apple, Bed, Footprints, type LucideIcon } from "lucide-react";

interface Habit {
  id: string;
  icon: LucideIcon;
  label: string;
  category: string;
  done: boolean;
  streak: number;
}

const habitDefs: { id: string; icon: LucideIcon; label: string; category: string }[] = [
  { id: "water",    icon: GlassWater, label: "Minum 8 gelas air putih",              category: "Hidrasi"    },
  { id: "veggie",   icon: Leaf,       label: "Makan sayur atau salad",               category: "Nutrisi"    },
  { id: "fruit",    icon: Apple,      label: "Makan buah hari ini",                  category: "Nutrisi"    },
  { id: "sugar",    icon: Coffee,     label: "Pilih minuman less sugar / no sugar",  category: "Nutrisi"    },
  { id: "exercise", icon: Footprints, label: "Aktif bergerak 30 menit",              category: "Aktivitas"  },
  { id: "sleep",    icon: Moon,       label: "Tidur 7–8 jam tadi malam",             category: "Tidur"      },
  { id: "vitamin",  icon: Pill,       label: "Minum suplemen / vitamin",             category: "Suplemen"   },
  { id: "handwash", icon: Hand,       label: "Cuci tangan sebelum makan",            category: "Kebersihan" },
  { id: "no-smoke", icon: Ban,        label: "Tidak merokok hari ini",               category: "Gaya Hidup" },
  { id: "stress",   icon: Bed,        label: "Luangkan waktu relaksasi",             category: "Mental"     },
];

const STORAGE_KEY = "sehatsetara_habits2"; // base key, will append user suffix
const WATER_KEY   = "sehatsetara_water";  // base key
const DATE_KEY    = "sehatsetara_date";   // base key

function getUserSuffix() {
  try {
    const raw = localStorage.getItem('sehatsetara_session');
    if (!raw) return 'anon';
    const parsed = JSON.parse(raw);
    return parsed && parsed.username ? String(parsed.username) : 'anon';
  } catch {
    return 'anon';
  }
}

function userKey(base: string) {
  const suffix = getUserSuffix();
  return `${base}_${suffix}`;
}

function loadHabits(): Habit[] {
  try {
    const today = new Date().toDateString();
    const key = userKey(STORAGE_KEY);
    const dateKey = userKey(DATE_KEY);

    // If user-specific data missing but global exists, copy it for this user (non-destructive migration)
    const globalRaw = localStorage.getItem(STORAGE_KEY);
    if (!localStorage.getItem(key) && globalRaw) {
      localStorage.setItem(key, globalRaw);
    }

    const raw = localStorage.getItem(key);
    const date = localStorage.getItem(dateKey) || localStorage.getItem(DATE_KEY);
    if (raw) {
      const saved: { id: string; done: boolean; streak: number }[] = JSON.parse(raw);
      const merged = habitDefs.map((def) => {
        const s = saved.find((x) => x.id === def.id) ?? { done: false, streak: 0 };
        if (date !== today) return { ...def, done: false, streak: s.done ? s.streak : 0 };
        return { ...def, done: s.done, streak: s.streak };
      });
      if (date !== today) localStorage.setItem(dateKey, today);
      return merged;
    }
  } catch {}
  localStorage.setItem(userKey(DATE_KEY), new Date().toDateString());
  return habitDefs.map((def) => ({ ...def, done: false, streak: 0 }));
}

function saveHabits(habits: Habit[]) {
  localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(habits.map(({ id, done, streak }) => ({ id, done, streak }))));
}

function loadWater(): number {
  try {
    const today = new Date().toDateString();
    const dateKey = userKey(DATE_KEY);
    const waterKey = userKey(WATER_KEY);

    // migrate global water/date if user-specific not present
    if (!localStorage.getItem(dateKey) && localStorage.getItem(DATE_KEY)) {
      localStorage.setItem(dateKey, localStorage.getItem(DATE_KEY) || '');
    }
    if (!localStorage.getItem(waterKey) && localStorage.getItem(WATER_KEY)) {
      localStorage.setItem(waterKey, localStorage.getItem(WATER_KEY) || '0');
    }

    if (localStorage.getItem(dateKey) === today)
      return parseInt(localStorage.getItem(waterKey) || "0") || 0;
  } catch {}
  return 0;
}

export default function LifestyleScreen() {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [water,  setWater]  = useState(() => loadWater());

  const waterTarget = 8;
  const doneCount   = habits.filter((h) => h.done).length;
  const pct         = Math.round((doneCount / habits.length) * 100);
  const topStreak   = [...habits].sort((a, b) => b.streak - a.streak)[0];

  useEffect(() => { saveHabits(habits); }, [habits]);
  useEffect(() => { localStorage.setItem(WATER_KEY, String(water)); }, [water]);

  // Menyambungkan asupan air dengan status kebiasaan air putih
  useEffect(() => {
    setHabits((prev) => prev.map((h) => {
      if (h.id === "water") {
        const isDone = water >= waterTarget;
        if (h.done !== isDone) {
          // Otomatis centang dan tambah streak jika target tercapai
          return { ...h, done: isDone, streak: isDone ? h.streak + 1 : Math.max(0, h.streak - 1) };
        }
      }
      return h;
    }));
  }, [water, waterTarget]);

  const toggleHabit = (id: string) => {
    // FITUR BARU: Memunculkan pesan peringatan jika tombol air putih diklik manual
    if (id === "water") {
      if (water < waterTarget) {
        alert("Yuk, selesaikan asupan air harianmu (8 gelas) di panel sebelah kiri terlebih dahulu! 💧");
      } else {
        alert("Target asupan air harianmu sudah tercapai! Hebat! 🏆");
      }
      return; 
    }
    
    setHabits((prev) => prev.map((h) =>
      h.id === id ? { ...h, done: !h.done, streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1) } : h
    ));
  };

  const motivationMsg =
    pct === 100 ? "Luar biasa! Semua kebiasaan selesai!" :
    pct >= 70   ? "Hampir sempurna! Terus semangat!" :
    pct >= 40   ? "Bagus! Separuh jalan sudah dilalui" :
                  "Yuk mulai hari dengan kebiasaan sehat!";

  const dayName  = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const categories = [...new Set(habits.map((h) => h.category))];

  return (
    <div className="p-4 sm:p-8 min-h-full">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <p className="text-[#6b7ab8] text-sm mb-1">{dayName}</p>
          <h1 className="text-[#1a2560] text-2xl sm:text-3xl flex items-center gap-2">
            Gaya Hidup Sehat <Leaf size={24} className="text-[#5b74f5]" />
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: progress + water + summary */}
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Progress ring */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-50 flex flex-col items-center text-center">
            <div className="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="52" fill="none" stroke="#edf2fd" strokeWidth="12" />
                <circle cx="64" cy="64" r="52" fill="none"
                  stroke={pct === 100 ? "#10b981" : "#5b74f5"}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 326} 326`}
                  className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[#1a2560] font-bold text-3xl leading-none">{pct}%</span>
                <span className="text-[#6b7ab8] text-xs mt-1">selesai</span>
              </div>
            </div>
            <p className="text-[#1a2560] font-medium text-sm leading-snug">{motivationMsg}</p>
            <p className="text-[#6b7ab8] text-xs mt-1.5">{doneCount} dari {habits.length} kebiasaan</p>
            {topStreak.streak > 1 && (
              <div className="flex items-center gap-1.5 mt-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5">
                <Flame size={14} className="text-orange-500 flex-shrink-0" />
                <span className="text-orange-700 text-xs font-medium">{topStreak.streak} hari streak!</span>
              </div>
            )}
          </div>

          {/* Water tracker */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GlassWater size={20} className="text-[#5b74f5]" />
                <div>
                  <div className="text-[#1a2560] font-semibold text-sm">Asupan Air</div>
                  <div className="text-[#5b74f5] text-xs">{water} / {waterTarget} gelas</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setWater((w) => Math.max(0, w - 1))}
                  className="w-8 h-8 bg-[#edf2fd] border border-blue-100 rounded-xl flex items-center justify-center text-[#5b74f5]">
                  <Minus size={14} />
                </button>
                <button onClick={() => setWater((w) => Math.min(12, w + 1))}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                  style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: waterTarget }).map((_, i) => (
                <button key={i} onClick={() => setWater(i < water ? i : i + 1)}
                  className={`h-8 rounded-xl transition-colors ${i < water ? "bg-[#5b74f5]" : "bg-[#edf2fd]"}`} />
              ))}
            </div>
            {water >= waterTarget && (
              <p className="text-[#5b74f5] text-xs mt-2.5 flex items-center gap-1">
                <Trophy size={12} /> Target harian tercapai!
              </p>
            )}
          </div>

          {/* Category progress */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-50">
            <div className="text-[#1a2560] font-semibold text-sm mb-3">Ringkasan Hari Ini</div>
            <div className="space-y-2.5">
              {categories.map((cat) => {
                const catH = habits.filter((h) => h.category === cat);
                const catDone = catH.filter((h) => h.done).length;
                const catPct = Math.round((catDone / catH.length) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6b7ab8]">{cat}</span>
                      <span className="text-[#5b74f5] font-medium">{catDone}/{catH.length}</span>
                    </div>
                    <div className="h-1.5 bg-[#edf2fd] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${catPct}%`, background: catPct === 100 ? "#10b981" : "linear-gradient(90deg, #5b74f5, #7a9bf8)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: habit grid */}
        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {habits.map((habit) => {
              const Icon = habit.icon;
              return (
                <button key={habit.id} onClick={() => toggleHabit(habit.id)}
                  className={`flex items-center gap-3 rounded-2xl p-4 border text-left transition-all ${
                    habit.done ? "bg-[#edf2fd] border-blue-200" : "bg-white border-blue-50 shadow-sm"
                  } ${
                    habit.id === "water" ? "cursor-help" : "active:scale-[0.97]"
                  }`}>
                  {habit.done
                    ? <CheckCircle size={22} className="text-[#5b74f5] flex-shrink-0" />
                    : <Circle      size={22} className="text-[#b0bef8] flex-shrink-0" />}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: habit.done ? "#c8d8fb" : "#edf2fd" }}>
                    <Icon size={18} className={habit.done ? "text-[#5b74f5]" : "text-[#8ba4f8]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm leading-tight ${habit.done ? "text-[#6b7ab8] line-through" : "text-[#1a2560]"}`}>
                      {habit.label}
                    </span>
                    <div className="text-[#b0bef8] text-xs mt-0.5">{habit.category}</div>
                  </div>
                  {habit.streak > 1 && (
                    <div className="flex items-center gap-0.5 bg-orange-50 border border-orange-100 rounded-lg px-1.5 py-0.5 flex-shrink-0">
                      <Flame size={11} className="text-orange-500" />
                      <span className="text-orange-600 text-xs font-bold">{habit.streak}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}