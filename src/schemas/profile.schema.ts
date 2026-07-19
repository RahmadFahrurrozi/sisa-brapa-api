import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  bio: z.string().max(160, "Bio maksimal 160 karakter").nullable().optional(),
  avatarUrl: z
    .string()
    .url("Avatar URL harus berupa URL yang valid")
    .nullable()
    .optional()
    .or(z.literal("")),
  occupation: z.string().max(100, "Pekerjaan maksimal 100 karakter").nullable().optional(),
  monthlyIncomeEst: z
    .number()
    .min(0, "Estimasi pendapatan bulanan tidak boleh negatif")
    .nullable()
    .optional(),
  currency: z.string().min(1, "Preferensi mata uang wajib diisi").optional(),
  language: z.string().min(1, "Preferensi bahasa wajib diisi").optional(),
  birthDate: z
    .string()
    .datetime("Tanggal lahir harus berupa format ISO datetime")
    .nullable()
    .optional(),
  financialType: z.enum(["frugal", "spender", "investor", "balanced"]).optional(),
  phoneNumber: z.string().max(20, "Nomor HP maksimal 20 karakter").nullable().optional(),
  address: z.string().max(255, "Alamat maksimal 255 karakter").nullable().optional(),
});
