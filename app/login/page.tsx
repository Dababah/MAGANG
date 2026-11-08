"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function Icon({
  name,
  size = 20,
}: {
  name: "user" | "shield" | "arrow";
  size?: number;
}) {
  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [nipp, setNipp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nipp, password }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Login gagal. Periksa kembali data Anda.",
        );
      router.replace(result.redirectTo ?? "/");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-form-panel">
        <div className="login-inner">
          <div className="brand">
            <img
              src="/assets/kai-logo-official.png"
              alt="PT Kereta Api Indonesia"
            />
            <span>
              <strong>PORTAL</strong> PERNYATAAN
            </span>
          </div>
          <div className="login-copy">
            <div className="eyebrow">
              <span /> PORTAL INTERNAL PEKERJA
            </div>
            <h1>Selamat datang kembali</h1>
            <p>
              Kelola pernyataan kerja Anda secara aman, cepat, dan terintegrasi.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="nipp">NIPP</label>
            <div className="field">
              <Icon name="user" size={19} />
              <input
                autoComplete="username"
                id="nipp"
                inputMode="numeric"
                onChange={(event) => setNipp(event.target.value)}
                placeholder="Masukkan NIPP Anda"
                required
                value={nipp}
              />
            </div>
            <div className="label-row">
              <label htmlFor="password">Kata sandi</label>
              <a
                className="text-button"
                href="mailto:admin@kai.id?subject=Pemulihan%20akun">
                Lupa kata sandi?
              </a>
            </div>
            <div className="field">
              <Icon name="shield" size={19} />
              <input
                autoComplete="current-password"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan kata sandi"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="primary-button login-button"
              disabled={loading}
              type="submit">
              {loading ? "Memproses..." : "Masuk ke portal"}{" "}
              <Icon name="arrow" size={19} />
            </button>
          </form>
          <div className="secure-note">
            <Icon name="shield" size={16} /> Dilindungi dengan sistem keamanan
            internal PT KAI
          </div>
        </div>
        <footer>
          © 2026 PT Kereta Api Indonesia (Persero) · Internal Use Only
        </footer>
      </section>
      <section className="login-art" aria-hidden="true">
        <div className="art-grid" />
        <div className="speed-line line-one" />
        <div className="speed-line line-two" />
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="logo-3d">
          <div className="logo-depth depth-3">
            <img src="/assets/kai-logo-official.png" alt="" />
          </div>
          <div className="logo-depth depth-2">
            <img src="/assets/kai-logo-official.png" alt="" />
          </div>
          <div className="logo-depth depth-1">
            <img src="/assets/kai-logo-official.png" alt="" />
          </div>
          <div className="logo-face">
            <img src="/assets/kai-logo-official.png" alt="" />
          </div>
        </div>
        <div className="art-message">
          <span className="art-index">01 / DIGITAL WORKSPACE</span>
          <h2>
            Melayani dengan
            <br />
            <em>integritas.</em>
          </h2>
          <p>
            Satu portal terpadu untuk proses pengajuan yang transparan dan
            akuntabel.
          </p>
        </div>
        <div className="rail-track">
          <i />
          <i />
        </div>
      </section>
    </main>
  );
}
