import { z } from "zod";

export const loginSchema = z.object({
  nipp: z.string().trim().min(1, "NIPP wajib diisi").max(30),
  password: z.string().min(1, "Kata sandi wajib diisi").max(128),
});
