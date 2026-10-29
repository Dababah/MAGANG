"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [nipp, setNipp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="login-page">
      <div className="login-visual">
        <Link className="brand login-brand" href="/">
          <span className="brand-mark">K</span>
          <span className="brand-copy">
            <strong>pernyataan</strong>
            <small>KERETA API INDONESIA</small>
          </span>
        </Link>
        <div className="login-visual-copy">
          <div className="eyebrow">
            <span /> RUANG KERJA DIGITAL
          </div>
          <h1>
            Setiap komitmen,
            <br />
            tercatat dengan baik.
          </h1>
          <p>
            Kelola pernyataan pekerja dan persetujuan dengan alur yang tertib,
            transparan, dan aman.
          </p>
          <div className="rail-illustration" aria-hidden="true">
            <div className="rail-sun" />
            <div className="rail-horizon" />
            <div className="rail-line rail-line-one" />
            <div className="rail-line rail-line-two" />
            <div className="rail-track" />
            <div className="rail-sleeper" />
            <div className="rail-sleeper second" />
            <div className="rail-sleeper third" />
            <div className="rail-sleeper fourth" />
            <div className="rail-sleeper fifth" />
            <div className="rail-sleeper sixth" />
          </div>
        </div>
        <div className="login-visual-footer">
          <span>PT Kereta Api Indonesia (Persero)</span>
          <span>
            AKHLAK <i /> Melayani dengan sepenuh hati
          </span>
        </div>
      </div>
      <section className="login-form-side">
        <form className="login-form" onSubmit={handleSubmit}>
          <span className="login-kicker">SELAMAT DATANG KEMBALI</span>
          <h2>Masuk ke akun Anda</h2>
          <p className="login-intro">
            Gunakan NIPP dan kata sandi akun pekerja KAI Anda.
          </p>
          <label htmlFor="nipp">NIPP</label>
          <input
            autoComplete="username"
            id="nipp"
            inputMode="numeric"
            onChange={(event) => setNipp(event.target.value)}
            placeholder="Masukkan NIPP"
            required
            value={nipp}
          />
          <div className="password-label">
            <label htmlFor="password">Kata sandi</label>
            <a href="mailto:admin@kai.id?subject=Pemulihan%20akun">
              Lupa kata sandi?
            </a>
          </div>
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Masukkan kata sandi"
            required
            type="password"
            value={password}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="login-submit" disabled={loading} type="submit">
            {loading ? "Memeriksa akun..." : "Masuk"}
            <span aria-hidden="true">→</span>
          </button>
          <div className="login-security">
            <span>●</span> Koneksi aman dan terenkripsi
          </div>
        </form>
        <div className="login-help">
          Mengalami kendala?{" "}
          <a href="mailto:admin@kai.id">Hubungi administrator wilayah</a>
        </div>
      </section>
    </main>
  );
}
