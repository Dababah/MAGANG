"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttachmentManager } from "@/components/attachment-manager";

type ApprovalItem = {
  id: number;
  noRef: string | null;
  namaLengkap: string;
  nipp: string;
  businessArea: string;
  alasan: string;
  status: "DIAJUKAN" | "DISETUJUI_ATASAN";
  tanggal: string;
};

export function ApprovalQueue({ items }: { items: ApprovalItem[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function decide(item: ApprovalItem, decision: "SETUJU" | "TOLAK") {
    const note = notes[item.id]?.trim() ?? "";
    if (decision === "TOLAK" && !note) {
      setErrors((current) => ({
        ...current,
        [item.id]: "Tuliskan alasan penolakan sebelum melanjutkan.",
      }));
      return;
    }

    setPendingId(item.id);
    setErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const response = await fetch(`/api/approvals/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keputusan: decision, catatan: note }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Keputusan belum dapat disimpan.");
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
      <div className="list-empty">
        Tidak ada pengajuan yang menunggu persetujuan Anda.
      </div>
    );
  }

  return (
    <div className="approval-queue">
      {items.map((item) => {
        const isPending = pendingId === item.id;
        const stage = item.status === "DIAJUKAN" ? "Tahap atasan" : "Tahap TI";

        return (
          <article className="approval-card" key={item.id}>
            <header className="approval-card-header">
              <div>
                <span className="eyebrow">
                  <span /> {stage.toUpperCase()}
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
            <AttachmentManager statementId={item.id} readOnly />
            <label className="approval-note-label" htmlFor={`note-${item.id}`}>
              Catatan keputusan
              <span>Wajib diisi untuk penolakan</span>
            </label>
            <textarea
              id={`note-${item.id}`}
              maxLength={2000}
              onChange={(event) =>
                setNotes((current) => ({
                  ...current,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="Tambahkan catatan untuk pekerja atau alasan penolakan..."
              rows={3}
              value={notes[item.id] ?? ""}
            />
            <div className="approval-card-footer">
              {errors[item.id] ? (
                <p className="form-error" role="alert">
                  {errors[item.id]}
                </p>
              ) : (
                <span className="approval-note-count">
                  {(notes[item.id] ?? "").length}/2.000
                </span>
              )}
              <div className="approval-actions">
                <button
                  className="approval-reject"
                  disabled={isPending}
                  onClick={() => void decide(item, "TOLAK")}
                  type="button">
                  Tolak
                </button>
                <button
                  className="primary-button"
                  disabled={isPending}
                  onClick={() => void decide(item, "SETUJU")}
                  type="button">
                  {isPending ? "Menyimpan..." : "Setujui"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
