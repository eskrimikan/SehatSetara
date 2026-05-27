import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import type { AuthSession } from "../types";
import { apiFetch } from "../api";

interface Props {
  onAuthSuccess: (session: AuthSession) => void;
}

type AuthMode = "login" | "register";

async function parseJson(response: Response) {
  return response.json().catch(() => ({}));
}

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("pengguna");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi");
      return;
    }

    try {
      setIsLoading(true);

      if (mode === "register") {
        const registerResponse = await apiFetch("/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password, role }),
        });
        const registerData = await parseJson(registerResponse);

        if (!registerResponse.ok) {
          throw new Error(registerData.error || "Registrasi gagal");
        }

        if (registerData.isApproved === false || role === "dokter") {
          setError(registerData.message || "Pendaftaran dokter menunggu persetujuan admin");
          return;
        }
      }

      const loginResponse = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const loginData = await parseJson(loginResponse);

      if (!loginResponse.ok) {
        throw new Error(loginData.error || "Login gagal");
      }

      onAuthSuccess({
        token: loginData.token,
        username: loginData.username || username.trim(),
        role: loginData.role || "pengguna",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full px-4 sm:px-8 pt-18 sm:pt-22 pb-8">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-blue-100 shadow-sm p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`px-4 py-2 rounded-xl text-sm ${mode === "login" ? "bg-[#5b74f5] text-white" : "bg-[#edf2fd] text-[#5b74f5]"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`px-4 py-2 rounded-xl text-sm ${mode === "register" ? "bg-[#5b74f5] text-white" : "bg-[#edf2fd] text-[#5b74f5]"}`}
          >
            Daftar
          </button>
        </div>

        <h1 className="text-[#1a2560] text-2xl font-semibold mb-2">
          {mode === "login" ? "Masuk ke akun Anda" : "Daftar akun baru"}
        </h1>
        <p className="text-[#6b7ab8] text-sm mb-6">
          Setelah login, tab Login akan berubah menjadi Profil.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[#1a2560]">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full border border-blue-100 rounded-2xl px-3 py-3 outline-none"
              placeholder="contoh: dokter"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[#1a2560]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full border border-blue-100 rounded-2xl px-3 py-3 outline-none"
              placeholder="masukkan password"
            />
          </label>

          {mode === "register" && (
            <label className="block">
              <span className="text-sm text-[#1a2560]">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full border border-blue-100 rounded-2xl px-3 py-3 outline-none"
              >
                <option value="pengguna">Pengguna</option>
                <option value="dokter">Dokter</option>
              </select>
            </label>
          )}

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-white font-medium disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#5b74f5,#7a9bf8)" }}
          >
            {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
            {isLoading ? "Memproses..." : mode === "login" ? "Login" : "Daftar & Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
