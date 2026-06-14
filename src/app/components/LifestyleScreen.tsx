import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Circle, Plus, Minus, Flame, Trophy, Leaf, Moon, Pill, Ban, Coffee, GlassWater, Hand, Apple, Bed, Footprints, RefreshCcw, TrendingUp, CalendarDays, type LucideIcon } from "lucide-react";
import { apiFetch } from "../api";
import type { HealthStatsSummary } from "../types";

interface Props {
  authToken: string;
}

interface Habit {
  id: string;
  icon: LucideIcon;
  label: string;
  category: string;
  done: boolean;
  streak: number;
}

const habitDefs: { id: string; icon: LucideIcon; label: string; category: string }[] = [
  { id: "water", icon: GlassWater, label: "Minum 8 gelas air putih", category: "Hidrasi" },
  { id: "veggie", icon: Leaf, label: "Makan sayur atau salad", category: "Nutrisi" },
  { id: "fruit", icon: Apple, label: "Makan buah hari ini", category: "Nutrisi" },
  { id: "sugar", icon: Coffee, label: "Pilih minuman less sugar / no sugar", category: "Nutrisi" },
  { id: "exercise", icon: Footprints, label: "Aktif bergerak 30 menit", category: "Aktivitas" },
  { id: "sleep", icon: Moon, label: "Tidur 7–8 jam tadi malam", category: "Tidur" },
  { id: "vitamin", icon: Pill, label: "Minum suplemen / vitamin", category: "Suplemen" },
  { id: "handwash", icon: Hand, label: "Cuci tangan sebelum makan", category: "Kebersihan" },
  { id: "no-smoke", icon: Ban, label: "Tidak merokok hari ini", category: "Gaya Hidup" },
  { id: "stress", icon: Bed, label: "Luangkan waktu relaksasi", category: "Mental" },
];

const STORAGE_KEY = "sehatsetara_habits2";
const WATER_KEY = "sehatsetara_water";
const DATE_KEY = "sehatsetara_date";

const categorySpecs = [
  { key: "water", label: "Minum Air" },
  { key: "movement", label: "Bergerak" },
  { key: "sleep", label: "Tidur" },
  { key: "nutrition", label: "Nutrisi" },
  { key: "supplement", label: "Suplemen" },
  { key: "cleanliness", label: "Kebersihan" },
  { key: "lifestyle", label: "Gaya Hidup" },
  { key: "mental", label: "Mental" },
] as const;

function getTodayStatDate() {
  return new Date().toISOString().slice(0, 10);
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buildChartPoints(items: { month: string; percentage: number }[]) {
  const sorted = [...items].sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length === 0) return [] as Array<{ month: string; percentage: number; x: number; y: number }>;

  return sorted.map((item, index) => {
    const x = sorted.length === 1 ? 50 : 10 + (index / (sorted.length - 1)) * 80;
    const y = 84 - (clampPercentage(item.percentage) / 100) * 64;
    return { ...item, x, y };
  });
}

function getUserSuffix() {
  try {
    const raw = localStorage.getItem("sehatsetara_session");
    if (!raw) return "anon";
    const parsed = JSON.parse(raw);
    return parsed && parsed.username ? String(parsed.username) : "anon";
  } catch {
    return "anon";
  }
}

function userKey(base: string) {
  return `${base}_${getUserSuffix()}`;
}

function loadHabits(): Habit[] {
  try {
    const today = new Date().toDateString();
    const key = userKey(STORAGE_KEY);
    const dateKey = userKey(DATE_KEY);

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

    if (!localStorage.getItem(dateKey) && localStorage.getItem(DATE_KEY)) {
      localStorage.setItem(dateKey, localStorage.getItem(DATE_KEY) || "");
    }
    if (!localStorage.getItem(waterKey) && localStorage.getItem(WATER_KEY)) {
      localStorage.setItem(waterKey, localStorage.getItem(WATER_KEY) || "0");
    }

    if (localStorage.getItem(dateKey) === today) return parseInt(localStorage.getItem(waterKey) || "0") || 0;
  } catch {}
  return 0;
}

function toMonthLabel(period: string) {
  if (!period) return "-";
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatJoinedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(parsed);
}

export default function LifestyleScreen({ authToken }: Props) {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [water, setWater] = useState(() => loadWater());
  const [stats, setStats] = useState<HealthStatsSummary | null>(null);
  const [statMode, setStatMode] = useState<"monthly" | "yearly">("monthly");
  const [selectedStatKey, setSelectedStatKey] = useState("water");

  const waterTarget = 8;
  const doneCount = habits.filter((h) => h.done).length;
  const pct = Math.round((doneCount / habits.length) * 100);
  const topStreak = [...habits].sort((a, b) => b.streak - a.streak)[0];

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(WATER_KEY, String(water));
  }, [water]);

  useEffect(() => {
    setHabits((prev) => prev.map((h) => {
      if (h.id === "water") {
        const isDone = water >= waterTarget;
        if (h.done !== isDone) {
          return { ...h, done: isDone, streak: isDone ? h.streak + 1 : Math.max(0, h.streak - 1) };
        }
      }
      return h;
    }));
  }, [water]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const today = getTodayStatDate();
        const nutritionDone = ["veggie", "fruit", "sugar"].filter((id) => habits.find((habit) => habit.id === id)?.done).length;
        const statValues = [
          { categoryKey: "water", categoryLabel: "Minum Air", value: water >= waterTarget },
          { categoryKey: "movement", categoryLabel: "Bergerak", value: habits.find((habit) => habit.id === "exercise")?.done || false },
          { categoryKey: "sleep", categoryLabel: "Tidur", value: habits.find((habit) => habit.id === "sleep")?.done || false },
          { categoryKey: "nutrition", categoryLabel: "Nutrisi", value: nutritionDone >= 2 },
          { categoryKey: "supplement", categoryLabel: "Suplemen", value: habits.find((habit) => habit.id === "vitamin")?.done || false },
          { categoryKey: "cleanliness", categoryLabel: "Kebersihan", value: habits.find((habit) => habit.id === "handwash")?.done || false },
          { categoryKey: "lifestyle", categoryLabel: "Gaya Hidup", value: habits.find((habit) => habit.id === "no-smoke")?.done || false },
          { categoryKey: "mental", categoryLabel: "Mental", value: habits.find((habit) => habit.id === "stress")?.done || false },
        ];

        await Promise.all(statValues.map((item) => apiFetch("/health/stats", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryKey: item.categoryKey,
            categoryLabel: item.categoryLabel,
            value: item.value,
            statDate: today,
          }),
        })));

        const response = await apiFetch("/health/stats", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;
        setStats(data as HealthStatsSummary);
      } catch {
        setStats(null);
      }
    };

    void loadStats();
  }, [authToken, habits, water, waterTarget]);

  const toggleHabit = (id: string) => {
    if (id === "water") {
      if (water < waterTarget) {
        alert("Yuk, selesaikan asupan air harianmu (8 gelas) di panel sebelah kiri terlebih dahulu! 💧");
      } else {
        alert("Target asupan air harianmu sudah tercapai! Hebat! 🏆");
      }
      return;
    }

    setHabits((prev) => prev.map((h) => (
      h.id === id ? { ...h, done: !h.done, streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1) } : h
    )));
  };

  const motivationMsg =
    pct === 100 ? "Luar biasa! Semua kebiasaan selesai!" :
    pct >= 70 ? "Hampir sempurna! Terus semangat!" :
    pct >= 40 ? "Bagus! Separuh jalan sudah dilalui" :
    "Yuk mulai hari dengan kebiasaan sehat!";

  const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const categories = [...new Set(habits.map((h) => h.category))];
  const statCategories = stats?.categories || [];
  const selectedCategory = statCategories.find((item) => item.key === selectedStatKey) || statCategories[0] || null;
  const selectedPeriodItems = selectedCategory ? (statMode === "monthly" ? selectedCategory.monthly : selectedCategory.yearly) : [];
  const selectedPeriodTotal = selectedPeriodItems.reduce((acc, item) => acc + item.totalDays, 0);
  const selectedPeriodCompleted = selectedPeriodItems.reduce((acc, item) => acc + item.completedDays, 0);
  const selectedPeriodPct = selectedPeriodTotal ? Math.round((selectedPeriodCompleted / selectedPeriodTotal) * 100) : 0;
  const chartPoints = useMemo(() => buildChartPoints(selectedPeriodItems), [selectedPeriodItems]);
  const chartPath = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  useEffect(() => {
    if (!statCategories.length) return;
    const selectedStillExists = statCategories.some((item) => item.key === selectedStatKey);
    if (selectedStillExists && selectedStatKey !== "water") return;

    const preferredCategory = [...statCategories]
      .filter((item) => item.totalDays > 0)
      .sort((a, b) => b.percentage - a.percentage || b.totalDays - a.totalDays)[0] || statCategories[0];

    if (preferredCategory && preferredCategory.key !== selectedStatKey) {
      setSelectedStatKey(preferredCategory.key);
    }
  }, [selectedStatKey, statCategories]);

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
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-50 flex flex-col items-center text-center">
            <div className="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="52" fill="none" stroke="#edf2fd" strokeWidth="12" />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  fill="none"
                  stroke={pct === 100 ? "#10b981" : "#5b74f5"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 326} 326`}
                  className="transition-all duration-700"
                />
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
                <button onClick={() => setWater((w) => Math.max(0, w - 1))} className="w-8 h-8 bg-[#edf2fd] border border-blue-100 rounded-xl flex items-center justify-center text-[#5b74f5]"><Minus size={14} /></button>
                <button onClick={() => setWater((w) => Math.min(12, w + 1))} className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}><Plus size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: waterTarget }).map((_, i) => (
                <button key={i} onClick={() => setWater(i < water ? i : i + 1)} className={`h-8 rounded-xl transition-colors ${i < water ? "bg-[#5b74f5]" : "bg-[#edf2fd]"}`} />
              ))}
            </div>
            {water >= waterTarget && (
              <p className="text-[#5b74f5] text-xs mt-2.5 flex items-center gap-1"><Trophy size={12} /> Target harian tercapai!</p>
            )}
          </div>

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
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${catPct}%`, background: catPct === 100 ? "#10b981" : "linear-gradient(90deg, #5b74f5, #7a9bf8)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {habits.map((habit) => {
              const Icon = habit.icon;
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex items-center gap-3 rounded-2xl p-4 border text-left transition-all ${habit.done ? "bg-[#edf2fd] border-blue-200" : "bg-white border-blue-50 shadow-sm"} ${habit.id === "water" ? "cursor-help" : "active:scale-[0.97]"}`}
                >
                  {habit.done ? <CheckCircle size={22} className="text-[#5b74f5] flex-shrink-0" /> : <Circle size={22} className="text-[#b0bef8] flex-shrink-0" />}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: habit.done ? "#c8d8fb" : "#edf2fd" }}>
                    <Icon size={18} className={habit.done ? "text-[#5b74f5]" : "text-[#8ba4f8]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm leading-tight ${habit.done ? "text-[#6b7ab8] line-through" : "text-[#1a2560]"}`}>{habit.label}</span>
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

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#1a2560] font-semibold text-sm">
                  <TrendingUp size={15} className="text-[#5b74f5]" /> Statistik Kesehatan
                </div>
                <p className="text-[#6b7ab8] text-xs mt-1">Filter kategori dan waktu, persentase dihitung dari hari sejak akun dibuat.</p>
              </div>
              <div className="inline-flex rounded-full bg-[#edf2fd] p-1 text-xs">
                <button onClick={() => setStatMode("monthly")} className={`rounded-full px-3 py-1.5 transition-colors ${statMode === "monthly" ? "bg-white text-[#1a2560] shadow-sm" : "text-[#6b7ab8]"}`}>Bulanan</button>
                <button onClick={() => setStatMode("yearly")} className={`rounded-full px-3 py-1.5 transition-colors ${statMode === "yearly" ? "bg-white text-[#1a2560] shadow-sm" : "text-[#6b7ab8]"}`}>Tahunan</button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {statCategories.length === 0 ? (
                <span className="text-sm text-[#6b7ab8]">Belum ada statistik tersimpan.</span>
              ) : (
                statCategories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setSelectedStatKey(category.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${selectedStatKey === category.key ? "bg-[#5b74f5] text-white border-[#5b74f5]" : "bg-white text-[#1a2560] border-blue-100"}`}
                  >
                    {category.label}
                  </button>
                ))
              )}
            </div>

            {selectedCategory && (
              <div className="mt-4 rounded-2xl bg-[#fbfdff] border border-blue-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[#1a2560] font-semibold">{selectedCategory.label}</div>
                    <div className="text-[#6b7ab8] text-xs mt-0.5">Mode {statMode === "monthly" ? "bulanan" : "tahunan"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-[#5b74f5]">{selectedPeriodPct}%</div>
                    <div className="text-[11px] text-[#8ea4f8]">{selectedPeriodCompleted}/{selectedPeriodTotal} hari tercatat</div>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#edf2fd] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${selectedPeriodPct}%`, background: "linear-gradient(90deg,#5b74f5,#7a9bf8)" }} />
                </div>
                <div className="mt-4 rounded-2xl border border-blue-50 bg-white p-3">
                  {chartPoints.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-xs text-[#6b7ab8]">Belum ada data untuk periode ini.</div>
                  ) : (
                    <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
                      <defs>
                        <linearGradient id="stat-line" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#5b74f5" />
                          <stop offset="100%" stopColor="#7a9bf8" />
                        </linearGradient>
                      </defs>
                      <line x1="10" y1="84" x2="90" y2="84" stroke="#edf2fd" strokeWidth="1.5" />
                      <line x1="10" y1="20" x2="10" y2="84" stroke="#edf2fd" strokeWidth="1.5" />
                      <polyline points={chartPath} fill="none" stroke="url(#stat-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {chartPoints.map((point) => (
                        <g key={point.month}>
                          <circle cx={point.x} cy={point.y} r="2.6" fill="#5b74f5" />
                          <circle cx={point.x} cy={point.y} r="4.8" fill="#5b74f5" fillOpacity="0.12" />
                        </g>
                      ))}
                    </svg>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPeriodItems.length === 0 ? (
                      <span className="text-xs text-[#6b7ab8]">Belum ada data untuk periode ini.</span>
                    ) : (
                      selectedPeriodItems.slice(0, 4).map((item) => (
                        <span key={item.month} className="inline-flex items-center gap-2 rounded-full bg-[#fbfdff] px-3 py-1.5 text-xs text-[#1a2560] border border-blue-100">
                          <CalendarDays size={12} className="text-[#5b74f5]" />
                          {toMonthLabel(item.month)}: {item.percentage}%
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-[#6b7ab8]">
                  Bergabung sejak {stats?.memberSince ? formatJoinedDate(stats.memberSince) : "-"}
                </div>
              </div>
            )}
          </div>

          {stats && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-50">
              <div className="text-[#1a2560] font-semibold text-sm mb-2">Ringkasan Statistik Cepat</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl bg-[#fbfdff] border border-blue-50 p-3">
                  <div className="text-xl font-semibold text-[#5b74f5]">{stats.daysSinceJoined}</div>
                  <div className="text-[11px] text-[#6b7ab8] mt-1">Hari sejak daftar</div>
                </div>
                <div className="rounded-2xl bg-[#fbfdff] border border-blue-50 p-3">
                  <div className="text-xl font-semibold text-[#5b74f5]">{stats.categories.length}</div>
                  <div className="text-[11px] text-[#6b7ab8] mt-1">Kategori dipantau</div>
                </div>
                <div className="rounded-2xl bg-[#fbfdff] border border-blue-50 p-3">
                  <div className="text-xl font-semibold text-[#5b74f5]">{Math.round(stats.categories.reduce((acc, item) => acc + item.percentage, 0) / Math.max(1, stats.categories.length))}%</div>
                  <div className="text-[11px] text-[#6b7ab8] mt-1">Rata-rata kepatuhan</div>
                </div>
                <div className="rounded-2xl bg-[#fbfdff] border border-blue-50 p-3">
                  <div className="text-xl font-semibold text-[#5b74f5]">{stats.categories.reduce((acc, item) => acc + item.completedDays, 0)}</div>
                  <div className="text-[11px] text-[#6b7ab8] mt-1">Total hari tercatat</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
