import { useEffect, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, FileText, LayoutDashboard, LockKeyhole, Pin, RefreshCw, Shield, Trash2 } from "lucide-react";
import type { AuthSession } from "../types";
import { apiFetch } from "../api";

interface Props {
  auth: AuthSession;
  onRefresh: () => Promise<void>;
}

type UserRow = {
  id: number;
  username: string;
  role: string;
  is_approved: boolean;
  full_name: string;
  hospital_name: string;
  created_at: string;
};

type ArticleRow = {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author_name: string;
  author_role: string;
};

type AuditRow = {
  id: number;
  actor_username: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  created_at: string;
};

function parseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function trimPreview(text: string) {
  const normalized = String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

export default function DashboardScreen({ auth, onRefresh }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [dailyTip, setDailyTip] = useState({ title: "", desc: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = { Authorization: `Bearer ${auth.token}` };

  const loadAll = async () => {
    try {
      const [usersResponse, articlesResponse, auditsResponse, tipResponse] = await Promise.all([
        apiFetch("/admin/users", { headers }),
        apiFetch("/admin/articles", { headers }),
        apiFetch("/admin/audit-logs", { headers }),
        apiFetch("/site/daily-tip"),
      ]);

      const [usersData, articlesData, auditsData, tipData] = await Promise.all([
        parseJson(usersResponse),
        parseJson(articlesResponse),
        parseJson(auditsResponse),
        parseJson(tipResponse),
      ]);

      if (!usersResponse.ok) throw new Error(usersData.error || "Gagal memuat user");
      if (!articlesResponse.ok) throw new Error(articlesData.error || "Gagal memuat artikel");
      if (!auditsResponse.ok) throw new Error(auditsData.error || "Gagal memuat audit log");
      if (!tipResponse.ok) throw new Error(tipData.error || "Gagal memuat tips kesehatan");

      setUsers(Array.isArray(usersData) ? usersData : []);
      setArticles(Array.isArray(articlesData) ? articlesData : []);
      setAudits(Array.isArray(auditsData) ? auditsData : []);
      setDailyTip({
        title: String(tipData.title || "Tidur 7–8 Jam Per Malam"),
        desc: String(tipData.desc || "Tidur cukup meningkatkan imunitas dan membantu tubuh memperbaiki sel-sel yang rusak."),
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memuat dashboard");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const refreshAll = async () => {
    await Promise.all([loadAll(), onRefresh()]);
  };

  const setUserStatus = async (userId: number, isApproved: boolean) => {
    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch(`/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ isApproved }),
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui status user");
      await refreshAll();
      setStatus(data.message || "Status user diperbarui");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memperbarui status user");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (userId: number, username: string) => {
    const nextPassword = window.prompt(`Password baru untuk ${username}`);
    if (!nextPassword) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch(`/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ password: nextPassword }),
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.error || "Gagal reset password");
      setStatus(data.message || "Password berhasil direset");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal reset password");
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (articleId: number, isPinned: boolean) => {
    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch(`/admin/articles/${articleId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ isPinned }),
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui pin");
      await refreshAll();
      setStatus(data.message || "Pin artikel diperbarui");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memperbarui pin");
    } finally {
      setBusy(false);
    }
  };

  const forceEdit = async (article: ArticleRow) => {
    const nextTitle = window.prompt("Judul baru", article.title);
    if (!nextTitle) return;
    const nextContent = window.prompt("Isi artikel baru (boleh HTML sederhana)", article.content);
    if (!nextContent) return;

    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch(`/admin/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ title: nextTitle, content: nextContent }),
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.error || "Gagal mengedit artikel");
      await refreshAll();
      setStatus(data.message || "Artikel berhasil diedit");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal mengedit artikel");
    } finally {
      setBusy(false);
    }
  };

  const takedown = async (articleId: number) => {
    if (!window.confirm("Hapus artikel ini?")) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch(`/admin/articles/${articleId}`, {
        method: "DELETE",
        headers: { ...headers },
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.error || "Gagal menghapus artikel");
      await refreshAll();
      setStatus(data.message || "Artikel berhasil dihapus");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal menghapus artikel");
    } finally {
      setBusy(false);
    }
  };

  const saveDailyTip = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dailyTip.title.trim() || !dailyTip.desc.trim()) {
      setStatus("Judul dan deskripsi tips wajib diisi");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch("/site/daily-tip", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(dailyTip),
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan tips");
      await refreshAll();
      setStatus(data.message || "Tips kesehatan berhasil diperbarui");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal menyimpan tips");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full px-4 sm:px-8 pt-18 sm:pt-22 pb-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-3xl border border-blue-100 bg-white shadow-sm p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#edf2fd] px-3 py-1 text-xs font-semibold text-[#5b74f5]">
                <LayoutDashboard size={13} /> Dasbor Superadmin
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-[#1a2560]">Manajemen tingkat tinggi</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#6b7ab8]">
                Kelola user, moderasi konten, lihat audit trail, dan ubah tips kesehatan harian dari satu tempat.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-[#f8faff] px-4 py-3 text-sm text-[#1a2560]">
              Login sebagai <span className="font-semibold">{auth.username}</span>
            </div>
          </div>

          {status && <div className="mt-4 rounded-2xl border border-blue-100 bg-[#f8faff] px-4 py-3 text-sm text-[#1a2560]">{status}</div>}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-blue-100 bg-white shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#1a2560] font-semibold text-lg">
              <Shield size={18} className="text-[#5b74f5]" /> Manajemen Pengguna
            </div>
            <p className="mt-1 text-sm text-[#6b7ab8]">Verifikasi akun, cabut akses, dan reset kredensial dari daftar user.</p>
            <div className="mt-4 space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-2xl border border-blue-100 bg-[#f8faff] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-[#1a2560]">{user.full_name || user.username}</div>
                      <div className="text-xs text-[#6b7ab8]">@{user.username} · {user.role} · {user.hospital_name || "Tanpa faskes"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => setUserStatus(user.id, true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button type="button" disabled={busy} onClick={() => setUserStatus(user.id, false)} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        <Ban size={13} /> Suspend
                      </button>
                      <button type="button" disabled={busy} onClick={() => resetPassword(user.id, user.username)} className="inline-flex items-center gap-1 rounded-full bg-[#edf2fd] px-3 py-2 text-xs font-semibold text-[#5b74f5]">
                        <LockKeyhole size={13} /> Reset
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-[#6b7ab8]">Status: {user.is_approved ? "Disetujui" : "Ditolak / dinonaktifkan"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-white shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#1a2560] font-semibold text-lg">
              <FileText size={18} className="text-[#5b74f5]" /> Moderasi Konten
            </div>
            <p className="mt-1 text-sm text-[#6b7ab8]">Takedown, force edit, dan pin konten resmi ke urutan teratas.</p>
            <div className="mt-4 space-y-3">
              {articles.map((article) => (
                <div key={article.id} className="rounded-2xl border border-blue-100 bg-[#f8faff] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-[#1a2560]">{article.title}</div>
                      <div className="text-xs text-[#6b7ab8]">{article.author_name} · {article.author_role} · {new Date(article.created_at).toLocaleString("id-ID")}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => togglePin(article.id, !article.is_pinned)} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        <Pin size={13} /> {article.is_pinned ? "Unpin" : "Pin"}
                      </button>
                      <button type="button" disabled={busy} onClick={() => forceEdit(article)} className="inline-flex items-center gap-1 rounded-full bg-[#edf2fd] px-3 py-2 text-xs font-semibold text-[#5b74f5]">
                        <RefreshCw size={13} /> Edit Paksa
                      </button>
                      <button type="button" disabled={busy} onClick={() => takedown(article.id)} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        <Trash2 size={13} /> Takedown
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#6b7ab8]">{trimPreview(article.content)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-blue-100 bg-white shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#1a2560] font-semibold text-lg">
              <AlertTriangle size={18} className="text-[#5b74f5]" /> Keamanan Data
            </div>
            <p className="mt-1 text-sm text-[#6b7ab8]">Audit trail sistem untuk jejak login, publish artikel, upload media, dan perubahan data.</p>
            <div className="mt-4 max-h-[460px] space-y-3 overflow-auto pr-1">
              {audits.map((log) => (
                <div key={log.id} className="rounded-2xl border border-blue-100 bg-[#f8faff] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#1a2560]">{log.action}</div>
                      <div className="text-xs text-[#6b7ab8]">
                        {log.actor_username || "Sistem"} · {log.actor_role || "-"} · {log.target_type || "-"} {log.target_id ? `#${log.target_id}` : ""}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#8ea4f8]">{new Date(log.created_at).toLocaleString("id-ID")}</div>
                  </div>
                  <div className="mt-2 text-xs text-[#6b7ab8]">IP: {log.ip_address || "-"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-white shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#1a2560] font-semibold text-lg">
              <RefreshCw size={18} className="text-[#5b74f5]" /> Tips Kesehatan Harian
            </div>
            <p className="mt-1 text-sm text-[#6b7ab8]">Edit teks yang tampil di beranda pasien.</p>
            <form onSubmit={saveDailyTip} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm text-[#1a2560]">Judul</span>
                <input
                  value={dailyTip.title}
                  onChange={(e) => setDailyTip((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1.5 w-full rounded-2xl border border-blue-100 px-3 py-3 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm text-[#1a2560]">Deskripsi</span>
                <textarea
                  value={dailyTip.desc}
                  onChange={(e) => setDailyTip((prev) => ({ ...prev, desc: e.target.value }))}
                  className="mt-1.5 min-h-[140px] w-full rounded-2xl border border-blue-100 px-3 py-3 outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-white font-medium disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#5b74f5,#7a9bf8)" }}
              >
                <RefreshCw size={16} />
                Simpan Tips
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
