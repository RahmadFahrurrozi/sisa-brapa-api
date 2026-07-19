import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getCombinedTransactions } from "../controllers/transaction.controller";

export const transactionRoutes = Router();

// Semua rute membutuhkan autentikasi
transactionRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: API Riwayat Transaksi Gabungan (Pemasukan & Pengeluaran)
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Ambil timeline transaksi gabungan (Pemasukan dan Pengeluaran diurutkan kronologis)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Filter bulan transaksi (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter tahun transaksi
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, income, expense]
 *           default: all
 *         description: Filter jenis transaksi
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari berdasarkan judul transaksi
 *     responses:
 *       200:
 *         description: Timeline gabungan berhasil diambil
 */
transactionRoutes.get("/", getCombinedTransactions);
