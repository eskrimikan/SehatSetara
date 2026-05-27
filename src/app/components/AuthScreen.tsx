import { useEffect, useRef, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import type { AuthSession } from "../types";
import { apiFetch } from "../api";

interface Props {
  onAuthSuccess: (session: AuthSession) => void;
}

type AuthMode = "login" | "register";
type PendingDoctor = { username: string; password: string; message: string };

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
  const [pendingDoctor, setPendingDoctor] = useState<PendingDoctor | null>(null);
  const [countdown, setCountdown] = useState(5);
  const autoLoginTimeout = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);

  const clearPendingTimers = () => {
    if (autoLoginTimeout.current !== null) {
      window.clearTimeout(autoLoginTimeout.current);
      autoLoginTimeout.current = null;
    }
    if (countdownTimer.current !== null) {
      window.clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  };

  const loginWithCredentials = async (nextUsername: string, nextPassword: string) => {
    const loginResponse = await apiFetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: nextUsername.trim(), password: nextPassword }),
    });
    const loginData = await parseJson(loginResponse);

    if (!loginResponse.ok) {
      throw new Error(loginData.error || "Login gagal");
    }

    return {
      token: loginData.token,
      username: loginData.username || nextUsername.trim(),
      role: loginData.role || "pengguna",
      isApproved: loginData.isApproved,
      pendingDoctor: Boolean(loginData.pendingDoctor),
      requestedRole: loginData.requestedRole || loginData.role,
    } as AuthSession;
  };

  const runLogin = async (nextUsername: string, nextPassword: string) => {
    setIsLoading(true);
    setError("");
    try {
      const session = await loginWithCredentials(nextUsername, nextPassword);
      onAuthSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingDoctor) return;
    setCountdown(5);
    clearPendingTimers();

    countdownTimer.current = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    autoLoginTimeout.current = window.setTimeout(() => {
      clearPendingTimers();
      setPendingDoctor(null);
      runLogin(pendingDoctor.username, pendingDoctor.password);
    }, 5000);

    return () => clearPendingTimers();
  }, [pendingDoctor]);

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
          setPendingDoctor({
            username: username.trim(),
            password,
            message: registerData.message || "Pendaftaran dokter menunggu persetujuan admin",
          });
          return;
        }
      }

      await runLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingDoctor) {
    return (
      <div className="h-full px-4 sm:px-8 pt-18 sm:pt-22 pb-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-blue-100 shadow-sm p-5 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#edf2fd] px-3 py-1 text-xs font-semibold text-[#5b74f5]">
            Persetujuan Dokter
          </div>
          <h1 className="text-[#1a2560] text-2xl font-semibold mt-3 mb-2">Persetujuan dokter menunggu admin</h1>
          <p className="text-[#6b7ab8] text-sm mb-4">
            {pendingDoctor.message}. Kamu bisa lanjut memakai aplikasi sebagai pengguna sambil menunggu persetujuan.
          </p>
          <div className="text-sm text-[#1a2560] bg-[#edf2fd] border border-blue-100 rounded-2xl px-3 py-2 mb-4">
            Login otomatis dalam <span className="font-semibold">{countdown}</span> detik.
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2 mb-3">{error}</div>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearPendingTimers();
                setPendingDoctor(null);
                runLogin(pendingDoctor.username, pendingDoctor.password);
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-white font-medium disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#5b74f5,#7a9bf8)" }}
            >
              {isLoading ? "Memproses..." : "Login sekarang"}
            </button>
            <button
              type="button"
              onClick={() => {
                clearPendingTimers();
                setPendingDoctor(null);
                setMode("login");
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-[#5b74f5] font-medium border border-blue-100"
            >
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
