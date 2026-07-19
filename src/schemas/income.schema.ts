import { z } from "zod";

export const INCOME_CATEGORIES = [
  "salary",
  "freelance",
  "investment",
  "gift",
  "business",
  "rental",
  "refund",
  "other",
] as const;
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const createIncomeSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(100, "Title max 100 char"),
  amount: z.number().positive("Amount must be more than 0").max(999_999_999, "Amount too big"),
  category: z.enum(INCOME_CATEGORIES, { message: "Category invalid" }),
  date: z.string().datetime({ message: "Format date invalid" }).optional(),
  note: z.string().max(500).optional(),
  walletId: z.string().optional(),
  autoSaveGoalId: z.string().optional(),
  autoSavePercentage: z.number().min(0).max(100).optional(),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

export const updateIncomeSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(100, "Title max 100 char").optional(),
  amount: z
    .number()
    .positive("Amount must be more than 0")
    .max(999_999_999, "Amount too big")
    .optional(),
  category: z.enum(INCOME_CATEGORIES, { message: "Category invalid" }).optional(),
  date: z.string().datetime({ message: "Format date invalid" }).optional(),
  note: z.string().max(500).optional(),
  walletId: z.string().optional(),
});

export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;

export const incomeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: z.enum(INCOME_CATEGORIES).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["date", "amount", "title"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type IncomeQuery = z.infer<typeof incomeQuerySchema>;
