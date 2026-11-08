"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttachmentManager } from "@/components/attachment-manager";

type VerificationItem = {
  id: number;
  noRef: string | null;
  alasan: string;
  tanggal: string;
  namaLengkap: string;
  nipp: string;
  businessArea: string;
};

export function FinalVerificationQueue({
  items,
}: {
  items: VerificationItem[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  async function verify(item: VerificationItem) {
    setPendingId(item.id);
    setErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const response = await fetch(`/api/statements/${item.id}/verification`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Verifikasi belum dapat disimpan.");
      }
      router.refresh();
    } catch (cause) {
      setErrors((current) => ({
        ...current,
        [item.id]:
          cause instanceof Error
            ? cause.message
            : "Terjadi kesalahan. Silakan coba lagi.",
      }));
    } finally {
      setPendingId(null);
    }
  }

  if (!items.length) {
    return (
      <div className="list-empty">Tidak ada dokumen untuk diverifikasi.</div>
    );
  }

  return (
    <div className="approval-queue">
      {items.map((item) => (
        <article className="approval-card" key={item.id}>
          <header className="approval-card-header">
            <div>
              <span className="eyebrow">
                <span /> VERIFIKASI ARSIP
              </span>
              <h2>{item.noRef ?? `Pernyataan #${item.id}`}</h2>
            </div>
            <time>{item.tanggal}</time>
          </header>
          <div className="approval-employee">
            <strong>{item.namaLengkap}</strong>
            <span>
              NIPP {item.nipp} <i /> {item.businessArea}
            </span>
          </div>
          <div className="approval-reason">
            <span>KETERANGAN PENGAJUAN</span>
            <p>{item.alasan}</p>
          </div>
          <AttachmentManager
            statementId={item.id}
            jenis="DOKUMEN_TTD"
            readOnly
          />
          <div className="approval-card-footer">
            {errors[item.id] ? (
              <p className="form-error" role="alert">
                {errors[item.id]}
              </p>
            ) : (
              <span className="approval-note-count">
                Pastikan scan dapat dibaca sebelum menyelesaikan arsip.
              </span>
            )}
            <button
              className="primary-button"
              disabled={pendingId === item.id}
              onClick={() => void verify(item)}
              type="button">
              {pendingId === item.id
                ? "Memverifikasi..."
                : "Verifikasi & selesaikan"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
