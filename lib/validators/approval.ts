import { z } from "zod";

export const approvalDecisionSchema = z
  .object({
    keputusan: z.enum(["SETUJU", "TOLAK"]),
    catatan: z
      .string()
      .trim()
      .max(2000, "Catatan maksimal 2.000 karakter")
      .optional(),
  })
  .refine((value) => value.keputusan !== "TOLAK" || Boolean(value.catatan), {
    message: "Catatan wajib diisi saat menolak pernyataan",
    path: ["catatan"],
  });
