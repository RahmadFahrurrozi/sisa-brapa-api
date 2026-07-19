import { z } from "zod";

export const TYPES = ["bank", "e_wallet", "cash"] as const;
export type WalletType = (typeof TYPES)[number];

export const PROVIDERS = [
  // Banks
  "BCA",
  "Mandiri",
  "BRI",
  "BNI",
  "BSI",
  "CIMB Niaga",
  "Danamon",
  "Permata",
  "Mega",
  "OCBC NISP",
  "Panin",
  "BTN",
  "Maybank",
  "Sinarmas",
  "Commonwealth",
  "UOB",
  "BTPN",
  "Jenius",
  "Jago",
  "Aladin",
  "Seabank",
  "Neo Commerce",
  // E-wallets
  "GoPay",
  "OVO",
  "DANA",
  "LinkAja",
  "ShopeePay",
  "AstraPay",
  // Cash
  "Cash",
] as const;
export type WalletProvider = (typeof PROVIDERS)[number];

export const createWalletSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(50, "Name max 50 char"),
  type: z.enum(TYPES, { message: "Type invalid (must be bank, e_wallet, or cash)" }),
  provider: z.enum(PROVIDERS, { message: "Provider invalid/unsupported" }),
  balance: z.number().default(0),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;

export const updateWalletSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(50, "Name max 50 char").optional(),
});

export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;
