import z from "zod";

export const BILLING_CYCLES = ["monthly", "yearly", "weakly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long"),
  amount: z.number().positive("Amount must be positive").max(999_999_999, "Amount is too big"),

  billingCycle: z.enum(BILLING_CYCLES, {
    message: "Billing cycle must be one of monthly, yearly, or weakly",
  }),

  nextBillingDate: z.string().datetime({
    message: "Format nextBillingDate invalid (must be ISO datetime)",
  }),

  note: z.string().max(500).optional(),
});

export type createSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
