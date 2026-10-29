"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewStatementPage() {
  const router = useRouter();
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Pengajuan belum dapat dikirim.");
      router.push("/statements?success=1");
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
    <main className="form-page">
      <header className="form-page-top">
        <Link className="brand" href="/">
          <span className="brand-mark">K</span>
          <span className="brand-copy">
            <strong>pernyataan</strong>
            <small>KERETA API INDONESIA</small>
          </span>
        </Link>
        <Link className="form-back" href="/statements">
          Kembali ke pernyataan
        </Link>
      </header>
      <div className="form-page-content">
        <div className="form-breadcrumb">
          <Link href="/">Ringkasan</Link>
          <span>/</span>
          <Link href="/statements">Pernyataan saya</Link>
          <span>/</span>
          <strong>Pengajuan baru</strong>
        </div>
        <div className="form-title">
          <div className="eyebrow">
            <span /> FORMULIR PERNYATAAN
          </div>
          <h1>Buat pernyataan</h1>
          <p>
            Pastikan informasi dan alasan pengajuan Anda sudah benar sebelum
            dikirim.
          </p>
        </div>
        <form className="statement-form" onSubmit={handleSubmit}>
          <div className="form-section-heading">
            <span className="form-step">01</span>
            <div>
              <h2>Informasi pengajuan</h2>
              <p>Identitas pekerja akan diisi dari data kepegawaian Anda.</p>
            </div>
          </div>
          <div className="form-readonly-grid">
            <div>
              <span>JENIS PERNYATAAN</span>
              <strong>Pernyataan pekerja</strong>
            </div>
            <div>
              <span>VERSI FORMULIR</span>
              <strong>Versi aktif</strong>
            </div>
          </div>
          <label className="field-label" htmlFor="alasan">
            Alasan atau keterangan <span>*</span>
          </label>
          <textarea
            id="alasan"
            maxLength={5000}
            minLength={10}
            onChange={(event) => setAlasan(event.target.value)}
            placeholder="Jelaskan tujuan dan ruang lingkup pernyataan yang diajukan..."
            required
            rows={7}
            value={alasan}
          />
          <div className="field-hint">
            <span>Jangan cantumkan kata sandi atau informasi rahasia.</span>
            <span>{alasan.length}/5.000</span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-consent">
            <span className="consent-mark">✓</span>
            <p>
              Saya menyatakan bahwa informasi yang disampaikan benar dan
              bersedia mengikuti ketentuan yang berlaku.
            </p>
          </div>
          <div className="form-actions">
            <Link href="/statements">Batal</Link>
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Mengirim..." : "Kirim pengajuan"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <footer className="form-footer">
          PT Kereta Api Indonesia (Persero) <span>•</span> Portal Pernyataan
        </footer>
      </div>
    </main>
  );
}
