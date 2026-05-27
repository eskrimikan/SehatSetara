import { useState } from "react";
import { PlusCircle } from "lucide-react";

interface Props {
  token: string;
  onPublished: () => Promise<void>;
}

export default function PublishScreen({ token, onPublished }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!title.trim() || !content.trim()) {
      setStatus({ kind: "err", text: "Judul dan isi wajib diisi" });
      return;
    }

    try {
      setIsLoading(true);
      const form = new FormData();
      form.append("title", title.trim());
      form.append("content", content.trim());

      const response = await fetch("/articles", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Gagal publish");
      }

      setTitle("");
      setContent("");
      setStatus({ kind: "ok", text: "Artikel berhasil dipublish" });
      await onPublished();
    } catch (err) {
      setStatus({ kind: "err", text: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full px-4 sm:px-8 pt-18 sm:pt-22 pb-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-blue-100 shadow-sm p-5 sm:p-8">
        <h1 className="text-[#1a2560] text-2xl font-semibold mb-2">Tulis Artikel</h1>
        <p className="text-[#6b7ab8] text-sm mb-6">Sementara: Judul, Isi, lalu Publish.</p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[#1a2560]">Judul</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full border border-blue-100 rounded-2xl px-3 py-3 outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[#1a2560]">Isi</span>
            <textarea
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5 w-full border border-blue-100 rounded-2xl px-3 py-3 outline-none resize-y"
            />
          </label>

          {status && (
            <div className={`text-sm rounded-2xl px-3 py-2 border ${status.kind === "ok" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-700 bg-red-50 border-red-100"}`}>
              {status.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-white font-medium disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#5b74f5,#7a9bf8)" }}
          >
            <PlusCircle size={16} />
            {isLoading ? "Publishing..." : "Publish"}
          </button>
        </form>
      </div>
    </div>
  );
}
