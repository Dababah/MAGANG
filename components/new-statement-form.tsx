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
        ) : (
          <form className="statement-form" onSubmit={handleSubmit}>
            <div className="form-section-heading">
              <span className="form-step">01</span>
              <div>
                <h2>Informasi pengajuan</h2>
                <p>Identitas ini akan disimpan sebagai snapshot pengajuan.</p>
              </div>
            </div>

            <div
              className="statement-document-shell"
              aria-label="Dokumen surat pernyataan">
              <div className="statement-doc-header">
                <div className="statement-doc-brand">
                  <span className="doc-mark">K</span>
                  <div>
                    <strong>PT KERETA API INDONESIA</strong>
                    <small>(PERSERO)</small>
                  </div>
                </div>
                <div className="statement-doc-badges">
                  <span className="doc-badge">TERBATAS</span>
                </div>
              </div>

              <div className="statement-doc-meta">
                <div className="meta-field">
                  <span>Nomor</span>
                  <strong>:</strong>
                  <em>FR-SM/01/018/004/2020</em>
                </div>
                <div className="meta-field">
                  <span>Tanggal Terbit</span>
                  <strong>:</strong>
                  <em>12 Oktober 2020</em>
                </div>
                <div className="meta-field">
                  <span>Versi</span>
                  <strong>:</strong>
                  <em>{formVersion.versi}</em>
                </div>
                <div className="meta-field">
                  <span>Halaman</span>
                  <strong>:</strong>
                  <em>1 dari 2</em>
                </div>
              </div>

              <div className="statement-doc-grid">
                <div className="doc-info-row">
                  <span>No. Ref</span>
                  <strong className="doc-fill">Akan dibuat otomatis</strong>
                </div>
                <div className="doc-info-row">
                  <span>Tanggal</span>
                  <strong className="doc-fill">{formattedToday}</strong>
                </div>
                <div className="doc-info-row">
                  <span>Business Area</span>
                  <strong className="doc-fill">{employee.businessArea}</strong>
                </div>
                <div className="doc-info-row">
                  <span>Formulir</span>
                  <strong className="doc-fill">
                    {formVersion.nomorDokumen} / {formVersion.versi}
                  </strong>
                </div>
              </div>

              <div className="statement-doc-body">
                <p className="formal-intro">
                  Pada hari ini, tanggal{" "}
                  <span className="inline-blank">
                    ...........................
                  </span>
                  bulan{" "}
                  <span className="inline-blank">
                    ............................
                  </span>{" "}
                  tahun{" "}
                  <span className="inline-blank">
                    ............................
                  </span>
                </p>
                <p className="formal-intro">
                  Dengan ini, saya yang bertandatangan di bawah ini:
                </p>

                <div className="formal-identity-grid">
                  <div className="formal-identity-row">
                    <span>Nama Lengkap</span>
                    <strong>{employee.namaLengkap}</strong>
                  </div>
                  <div className="formal-identity-row">
                    <span>NIPP</span>
                    <strong>{employee.nipp}</strong>
                  </div>
                  <div className="formal-identity-row">
                    <span>Jabatan</span>
                    <strong>{employee.jabatan}</strong>
                  </div>
                  <div className="formal-identity-row">
                    <span>Tempat Kedudukan</span>
                    <strong>{employee.tempatKedudukan}</strong>
                  </div>
                </div>

                <p className="formal-declare">
                  menyatakan bahwa saya tidak bersedia dilaksanakan
                  install/uninstall perangkat lunak dan bersedia menanggung
                  segala konsekuensinya baik secara finansial maupun hukum
                  sesuai peraturan perundang-undangan yang berlaku serta
                  ketentuan perusahaan.
                </p>

                <div className="formal-reason-box">
                  <label>Alasan</label>
                  <div className="reason-placeholder">
                    {alasan || "Jelaskan kebutuhan dan alasan secara jelas..."}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-readonly-grid">
              <div>
                <span>NAMA LENGKAP</span>
                <strong>{employee.namaLengkap}</strong>
              </div>
              <div>
                <span>NIPP</span>
                <strong>{employee.nipp}</strong>
              </div>
              <div>
                <span>JABATAN</span>
                <strong>{employee.jabatan}</strong>
              </div>
              <div>
                <span>TEMPAT KEDUDUKAN</span>
                <strong>{employee.tempatKedudukan}</strong>
              </div>
              <div>
                <span>BUSINESS AREA</span>
                <strong>{employee.businessArea}</strong>
              </div>
              <div>
                <span>FORMULIR</span>
                <strong>
                  {formVersion.nomorDokumen} · {formVersion.versi}
                </strong>
              </div>
            </div>

            <section className="form-terms">
              <h2>Ketentuan pernyataan</h2>
              <p>{formVersion.teksKetentuan}</p>
            </section>

            <label className="field-label" htmlFor="alasan">
              Alasan atau keterangan <span>*</span>
            </label>
            <textarea
              id="alasan"
              maxLength={5000}
              minLength={10}
              onChange={(event) => setAlasan(event.target.value)}
              placeholder="Jelaskan tujuan, kebutuhan, dan situasi yang melatarbelakangi pernyataan ini. Contoh: kebutuhan operasional, perubahan aplikasi, atau pemeliharaan sistem yang dibutuhkan dalam rangka pekerjaan."
              required
              rows={8}
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
                Saya menyatakan bahwa informasi yang disampaikan benar, dapat
                dipertanggungjawabkan, dan bersedia mengikuti ketentuan yang
                berlaku dalam pelaksanaan tugas dan penggunaan sistem.
              </p>
            </div>
            <div
              className="statement-signature-boxes"
              aria-label="Area tanda tangan">
              <div className="signature-block">
                <span>Pekerja</span>
                <div className="signature-line" />
                <strong>{employee.namaLengkap}</strong>
              </div>
              <div className="signature-block">
                <span>NIPP</span>
                <div className="signature-line" />
                <strong>{employee.nipp}</strong>
              </div>
              <div className="signature-block">
                <span>Tempat, tanggal</span>
                <div className="signature-line" />
                <strong>
                  {employee.tempatKedudukan}, {formattedToday}
                </strong>
              </div>
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
                Pengajuan Anda telah dibuat. Anda dapat menambahkan lampiran
                pendukung di bawah ini sebelum mengirim pernyataan.
              </p>
            </div>

            <AttachmentManager
              statementId={statementId}
              readOnly={false}
              onAttachmentsChange={() => {}}
            />

            <div className="form-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  router.push("/statements?success=1");
                  router.refresh();
                }}>
                Selesai & Kembali
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  router.push(`/statements/${statementId}?action=submit`);
                }}>
                Lanjut ke Pengajuan
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
