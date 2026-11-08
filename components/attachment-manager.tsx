import React, { useState, useRef } from "react";

interface AttachmentListProps {
  statementId: number;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  onUploadComplete?: () => void;
  jenis?: "PENDUKUNG" | "DOKUMEN_TTD";
  readOnly?: boolean;
}

interface Attachment {
  id: number;
  jenis: "PENDUKUNG" | "DOKUMEN_TTD";
  namaFile: string;
  tipeMime: string;
  ukuran: number;
  createdAt: string;
  uploader?: {
    employee: {
      namaLengkap: string;
    };
  };
}

export function AttachmentManager({
  statementId,
  onAttachmentsChange,
  onUploadComplete,
  jenis,
  readOnly = false,
}: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);

  // Load attachments on mount
  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/statements/${statementId}/attachments${jenis ? `?jenis=${jenis}` : ""}`,
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Gagal memuat daftar lampiran.");
        }
        if (active) {
          setAttachments(data.data);
          setLoadError(null);
        }
      } catch (cause) {
        if (active) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Gagal memuat daftar lampiran.",
          );
        }
      } finally {
        if (active) setAttachmentsLoaded(true);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [statementId, jenis]);

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const file = files[0];

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/statements/${statementId}/attachments`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal mengunggah file");
      }

      const data = await response.json();
      const newAttachment = data.data;

      setAttachments((prev) => [newAttachment, ...prev]);
      if (onAttachmentsChange) {
        onAttachmentsChange([newAttachment, ...(attachments || [])]);
      }
      setSuccess(
        `File "${file.name}" berhasil diunggah (${formatFileSize(file.size)})`,
      );
      onUploadComplete?.();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal mengunggah file";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    if (!confirm("Apakah Anda yakin ingin menghapus lampiran ini?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/statements/${statementId}/attachments?attachmentId=${attachmentId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus lampiran");
      }

      setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
      onAttachmentsChange?.(
        attachments.filter((att) => att.id !== attachmentId),
      );
      setSuccess("Lampiran berhasil dihapus");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal menghapus lampiran";
      setError(errorMessage);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  }

  return (
    <div className="attachment-manager">
      <div className="attachment-section">
        <h3>
          {jenis === "DOKUMEN_TTD" ? "Dokumen bertanda tangan" : "Lampiran"}
        </h3>

        {!readOnly && (
          <div
            className={`attachment-drop-zone ${isDragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files);
            }}>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileUpload(e.target.files)}
              accept={
                jenis === "DOKUMEN_TTD"
                  ? ".pdf,.jpg,.jpeg,.png,.webp"
                  : ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
              }
              disabled={isLoading}
              style={{ display: "none" }}
            />

            <div className="drop-content">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="drop-text">
                Drag dan drop file di sini atau{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="browse-button">
                  browse
                </button>
              </p>
              <p className="drop-hint">
                {jenis === "DOKUMEN_TTD"
                  ? "PDF atau gambar, maksimal 10MB"
                  : "Maksimal 10MB. Format: PDF, Word, Excel, Gambar, Teks"}
              </p>
            </div>
          </div>
        )}

        {error && <div className="attachment-error">{error}</div>}
        {success && <div className="attachment-success">{success}</div>}

        {loadError && (
          <div className="attachment-error" role="alert">
            {loadError}
          </div>
        )}
        {!attachmentsLoaded && <p aria-live="polite">Memuat lampiran...</p>}
        {attachmentsLoaded && !loadError && attachments.length > 0 ? (
          <div className="attachment-list">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Ukuran</th>
                  <th>Diunggah oleh</th>
                  <th>Tanggal</th>
                  {!readOnly && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {attachments.map((attachment) => (
                  <tr key={attachment.id}>
                    <td className="filename">
                      <a
                        href={`/api/statements/${statementId}/attachments/${attachment.id}/download`}
                        download>
                        {attachment.namaFile}
                      </a>
                    </td>
                    <td>{formatFileSize(attachment.ukuran)}</td>
                    <td>
                      {attachment.uploader?.employee.namaLengkap ||
                        "Tidak diketahui"}
                    </td>
                    <td>{formatDate(attachment.createdAt)}</td>
                    {!readOnly && (
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="delete-button"
                          title="Hapus lampiran">
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : attachmentsLoaded && !loadError ? (
          <div className="attachment-empty">
            {readOnly ? "Tidak ada lampiran." : "Belum ada lampiran diunggah."}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .attachment-manager {
          margin-top: 24px;
        }

        .attachment-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #222;
        }

        .attachment-drop-zone {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background-color: #fafafa;
          margin-bottom: 16px;
        }

        .attachment-drop-zone:hover {
          border-color: #999;
          background-color: #f5f5f5;
        }

        .attachment-drop-zone.dragging {
          border-color: #0066cc;
          background-color: #e6f2ff;
        }

        .drop-content svg {
          color: #666;
          margin-bottom: 12px;
        }

        .drop-text {
          margin: 8px 0;
          font-size: 14px;
          color: #333;
        }

        .browse-button {
          background: none;
          border: none;
          color: #0066cc;
          cursor: pointer;
          text-decoration: underline;
          font-size: 14px;
          padding: 0;
        }

        .browse-button:hover {
          color: #0052a3;
        }

        .browse-button:disabled {
          color: #ccc;
          cursor: not-allowed;
        }

        .drop-hint {
          margin-top: 8px;
          font-size: 12px;
          color: #999;
        }

        .attachment-error {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .attachment-success {
          background-color: #efe;
          border: 1px solid #cfc;
          color: #3c3;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .attachment-list {
          margin-top: 16px;
          overflow-x: auto;
        }

        .attachment-list table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .attachment-list th {
          background-color: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 1px solid #ddd;
        }

        .attachment-list td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .attachment-list tr:hover {
          background-color: #fafafa;
        }

        .filename a {
          color: #0066cc;
          text-decoration: none;
          word-break: break-word;
        }

        .filename a:hover {
          text-decoration: underline;
        }

        .delete-button {
          background: none;
          border: 1px solid #ddd;
          color: #c33;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .delete-button:hover {
          background-color: #fee;
          border-color: #fcc;
        }

        .attachment-empty {
          padding: 24px;
          text-align: center;
          color: #999;
          font-size: 14px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
