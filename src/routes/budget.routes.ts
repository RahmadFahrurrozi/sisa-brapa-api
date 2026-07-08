import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { setBudget, getBudgetStatus, getBudgetAlerts } from "../controllers/budget.controller";

export const budgetRoutes = Router();

budgetRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: API Pengaturan Anggaran/Limit Pengeluaran (Membutuhkan Bearer JWT Token)
 */

/**
 * @swagger
 * /budgets:
 *   post:
 *     summary: Setel atau perbarui limit budget bulanan
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - category
 *               - month
 *               - year
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000000
 *               category:
 *                 type: string
 *                 example: all
 *               month:
 *                 type: integer
 *                 example: 7
 *               year:
 *                 type: integer
 *                 example: 2026
 *     responses:
 *       200:
 *         description: Budget berhasil dikonfigurasi
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
budgetRoutes.post("/", setBudget);

/**
 * @swagger
 * /budgets/status:
 *   get:
 *     summary: Ambil status pemakaian budget berdasarkan bulan dan tahun
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Bulan status (default bulan saat ini)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tahun status (default tahun saat ini)
 *     responses:
 *       200:
 *         description: Status budget berhasil diambil
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
budgetRoutes.get("/status", getBudgetStatus);

/**
 * @swagger
 * /budgets/alerts:
 *   get:
 *     summary: Ambil peringatan sisa budget bulanan yang hampir habis (>= 80%) atau habis (>= 100%)
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data budget alerts berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
budgetRoutes.get("/alerts", getBudgetAlerts);

