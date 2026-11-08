import { z } from "zod";

export const createStatementSchema = z.object({
  alasan: z
    .string()
    .trim()
    .min(10, "Alasan minimal 10 karakter")
    .max(5000, "Alasan maksimal 5.000 karakter"),
  formVersionId: z.number().int().positive(),
});

export const statementStatusSchema = z.enum([
  "DRAFT",
  "DIAJUKAN",
  "DISETUJUI_ATASAN",
  "DISETUJUI_TI",
  "MENUNGGU_TANDA_TANGAN",
  "MENUNGGU_VERIFIKASI",
  "SELESAI",
  "DITOLAK",
]);
