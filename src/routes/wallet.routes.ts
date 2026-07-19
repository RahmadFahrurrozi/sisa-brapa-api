import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createWalletSchema, updateWalletSchema } from "../schemas/wallet.schema";
import {
  createWallet,
  getAllWallets,
  getWalletById,
  updateWallet,
  deleteWallet,
} from "../controllers/wallet.controller";

export const walletRoutes = Router();

// Semua endpoint membutuhkan autentikasi
walletRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Wallets
 *   description: API Manajemen Dompet / Rekening Virtual
 */

/**
 * @swagger
 * /wallets:
 *   post:
 *     summary: Buat dompet baru
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - provider
 *             properties:
 *               name:
 *                 type: string
 *                 example: BCA Utama
 *               type:
 *                 type: string
 *                 enum: [bank, e_wallet, cash]
 *                 example: bank
 *               provider:
 *                 type: string
 *                 example: BCA
 *               balance:
 *                 type: number
 *                 example: 1000000
 *     responses:
 *       201:
 *         description: Wallet berhasil dibuat
 *       400:
 *         description: Input tidak valid atau nama duplikat
 */
walletRoutes.post("/", validate(createWalletSchema), createWallet);

/**
 * @swagger
 * /wallets:
 *   get:
 *     summary: Ambil semua dompet user
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar dompet berhasil diambil
 */
walletRoutes.get("/", getAllWallets);

/**
 * @swagger
 * /wallets/{id}:
 *   get:
 *     summary: Ambil detail dompet berdasarkan ID
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Dompet
 *     responses:
 *       200:
 *         description: Detail dompet ditemukan
 *       404:
 *         description: Dompet tidak ditemukan
 */
walletRoutes.get("/:id", getWalletById);

/**
 * @swagger
 * /wallets/{id}:
 *   put:
 *     summary: Update nama dompet
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Dompet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: BCA Baru
 *     responses:
 *       200:
 *         description: Wallet berhasil diperbarui
 *       400:
 *         description: Input tidak valid
 *       404:
 *         description: Dompet tidak ditemukan
 */
walletRoutes.put("/:id", validate(updateWalletSchema), updateWallet);

/**
 * @swagger
 * /wallets/{id}:
 *   delete:
 *     summary: Hapus dompet berdasarkan ID
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Dompet
 *     responses:
 *       200:
 *         description: Dompet berhasil dihapus
 *       404:
 *         description: Dompet tidak ditemukan
 */
walletRoutes.delete("/:id", deleteWallet);
