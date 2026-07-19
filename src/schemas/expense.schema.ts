import { z } from "zod";

export const CATEGORIES = [
  "food",
  "transport",
  "entertainment",
  "health",
  "education",
  "bills",
  "shopping",
  "groceries",
  "housing",
  "internet",
  "maintenance",
  "personal_care",
  "other",
] as const;
export type ExpenseCategory = (typeof CATEGORIES)[number];

export const createExpenseSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(100, "Title max 100 char"),

  amount: z.number().positive("Amount must be more than 0").max(999_999_999, "Amount too big"),

  category: z.enum(CATEGORIES, {
    message: "Category invalid",
  }),

  date: z.string().datetime({ message: "Format date invalid" }).optional(),

  note: z.string().max(500).optional(),

  walletId: z.string().optional(), // Opsional walletId untuk pencatatan dompet pengeluaran
});

// z.infer<> → ambil TypeScript type dari schema Zod secara otomatis
// Tidak perlu definisi interface manual — DRY (Don't Repeat Yourself)
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
// Hasilnya: { title: string, amount: number, category: "food"|..., ... }

export const updateExpenseSchema = createExpenseSchema.partial();
// .partial() → semua field jadi optional (untuk PATCH)

// src/schemas/expense.schema.ts

// Query params selalu datang sebagai string dari URL
// z.coerce.number() → konversi string ke number otomatis
export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: z.enum(CATEGORIES).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  search: z.string().optional(), // Cari berdasarkan title
  sortBy: z.enum(["date", "amount", "title"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
