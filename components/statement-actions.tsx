"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttachmentManager } from "@/components/attachment-manager";

export function StatementActions({
  statementId,
  noRef,
  status,
}: {
  statementId: number;
  noRef: string | null;
  status: string;
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const canUploadSignedDocument = status === "MENUNGGU_TANDA_TANGAN";
  const hasSignedDocument =
    status === "MENUNGGU_VERIFIKASI" || status === "SELESAI";

  return (
    <div className="statement-actions">
      {status !== "DRAFT" && noRef && (
        <a
          className="statement-download"
          href={`/api/statements/${statementId}/pdf`}
          aria-label={`Unduh PDF ${noRef}`}>
          Unduh PDF
        </a>
      )}
      {(canUploadSignedDocument || hasSignedDocument) && (
        <>
          <button
            className={`statement-upload-toggle${hasSignedDocument ? " is-secondary" : ""}`}
            type="button"
            aria-expanded={uploadOpen}
            onClick={() => setUploadOpen((open) => !open)}>
            {uploadOpen
              ? "Tutup dokumen"
              : hasSignedDocument
                ? "Lihat dokumen bertanda tangan"
                : "Unggah dokumen bertanda tangan"}
          </button>
          {uploadOpen && (
            <div className="statement-upload-panel">
              <AttachmentManager
                statementId={statementId}
                jenis="DOKUMEN_TTD"
                readOnly={hasSignedDocument}
                onUploadComplete={() => router.refresh()}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
