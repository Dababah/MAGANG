"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AttachmentManager } from "./attachment-manager";

type EmployeeSnapshot = {
  namaLengkap: string;
  nipp: string;
  jabatan: string;
  tempatKedudukan: string;
  businessArea: string;
};

type FormVersion = {
  id: number;
  nomorDokumen: string;
  versi: string;
  tanggalTerbit: string;
  teksKetentuan: string;
};

export function NewStatementForm({
  employee,
  formVersion,
  unavailable,
}: {
  employee: EmployeeSnapshot | null;
  formVersion: FormVersion | null;
  unavailable: boolean;
}) {
  const router = useRouter();
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statementId, setStatementId] = useState<number | null>(null);

  const today = new Date();
  const formattedToday = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(today);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || statementId !== null) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan, formVersionId: formVersion?.id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Pengajuan belum dapat dikirim.");

      // Set the statement ID to show attachment manager
      setStatementId(result.data?.id);
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
          <img
            src="/logo-kai-icon.svg"
            alt="KAI"
            className="logo-icon"
            width={100}
            height={50}
          />
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
          <p>Periksa data dan ketentuan sebelum mengirim pengajuan.</p>
        </div>
        {unavailable || !employee || !formVersion ? (
          <section className="statement-form" aria-live="polite">
            <h2>Pengajuan belum dapat dibuat</h2>
            <p>
              Data pekerja, wilayah aktif, atau formulir aktif belum tersedia.
              Hubungi administrator wilayah untuk pemeriksaan data.
            </p>
            <Link className="form-back" href="/statements">
              Kembali ke pernyataan
            </Link>
          </section>
        ) : statementId !== null ? null : (
          <form
            className="statement-form figma-statement-form"
            onSubmit={handleSubmit}>
            <section className="form-block">
              <div className="form-block-title">
                <span>01</span>
                <div>
                  <h3>Identitas pekerja</h3>
                  <p>Data diambil dari profil kepegawaian Anda.</p>
                </div>
              </div>
              <div className="identity-grid">
                <label>
                  Nama lengkap
                  <input value={employee.namaLengkap} readOnly />
                </label>
                <label>
                  NIPP
                  <input value={employee.nipp} readOnly />
                </label>
                <label>
                  Jabatan
                  <input value={employee.jabatan} readOnly />
                </label>
                <label>
                  Tempat kedudukan
                  <input value={employee.tempatKedudukan} readOnly />
                </label>
              </div>
              <div className="figma-form-meta">
                <span>{employee.businessArea}</span>
                <span>
                  {formVersion.nomorDokumen} · {formVersion.versi}
                </span>
                <span>{formattedToday}</span>
              </div>
            </section>
            <section className="form-block">
              <div className="form-block-title">
                <span>02</span>
                <div>
                  <h3>Alasan pernyataan</h3>
                  <p>Jelaskan alasan secara jelas dan bertanggung jawab.</p>
                </div>
              </div>
              <label className="reason-label" htmlFor="alasan">
                Alasan atau keterangan
                <textarea
                  id="alasan"
                  maxLength={5000}
                  minLength={10}
                  onChange={(event) => setAlasan(event.target.value)}
                  placeholder="Tuliskan alasan pengajuan Anda di sini..."
                  required
                  rows={7}
                  value={alasan}
                />
                <small>
                  Minimal 10 karakter · Maksimal 5.000 karakter ·{" "}
                  {alasan.length}/5.000
                </small>
              </label>
              <details className="form-terms figma-form-terms">
                <summary>
                  Ketentuan {formVersion.nomorDokumen} · versi{" "}
                  {formVersion.versi}
                </summary>
                <p>{formVersion.teksKetentuan}</p>
              </details>
            </section>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-notice">
              <span className="consent-mark">✓</span>
              <p>
                Dengan mengirim formulir ini, Anda menyatakan data yang
                diberikan benar dan bersedia mengikuti ketentuan perusahaan yang
                berlaku.
              </p>
            </div>
            <div className="form-actions">
              <Link href="/statements">Batal</Link>
              <button
                className="primary-button"
                disabled={loading}
                type="submit">
                {loading ? "Mengirim..." : "Kirim pengajuan"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        )}

        {statementId && (
          <section className="statement-form submission-success">
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h2>Pernyataan berhasil dibuat</h2>
              <p>
                Pengajuan telah dikirim untuk persetujuan. Lampiran pendukung
                dapat ditambahkan di bawah ini; scan bertanda tangan diunggah
                setelah persetujuan TI.
              </p>
            </div>

            <AttachmentManager
              statementId={statementId}
              readOnly={false}
              onAttachmentsChange={() => {}}
            />

            <div className="form-actions">
              <button
                className="primary-button"
                onClick={() => {
                  router.push("/statements?success=1");
                  router.refresh();
                }}>
                Lihat pengajuan
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}
        <footer className="form-footer">
          PT Kereta Api Indonesia (Persero) <span>•</span> Portal Pernyataan
        </footer>
      </div>
    </main>
  );
}
