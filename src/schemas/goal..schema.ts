import z from "zod";

export const createGoalSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(200, "Name is to long"),
  targetAmount: z
    .number()
    .positive("Target amount must be positive")
    .max(999_999_999, "Target amount is too large"),
  deadline: z.coerce
    .date({
      message: "Format deadline invalid (must be ISO datetime)",
    })
    .optional(),
});

export const addSavingSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(999_999_999, "Amount is too large"),
  date: z.coerce
    .date({
      message: "Format date invalid (must be date)",
    })
    .optional(),
  note: z.string().max(500).optional().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type AddSavingInput = z.infer<typeof addSavingSchema>;
