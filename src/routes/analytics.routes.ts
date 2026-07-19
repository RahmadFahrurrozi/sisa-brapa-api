import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getBalanceSummary,
  getIncomeVsExpenseTrend,
  getExpenseAnalytics,
  getExpenseComparison,
} from "../controllers/analytics.controller";

export const analyticsRoutes = Router();

// Semua endpoint membutuhkan autentikasi
analyticsRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: API Analitik Keuangan (Saldo, Tren Pendapatan vs Pengeluaran)
 */

/**
 * @swagger
 * /analytics/balance:
 *   get:
 *     summary: Ambil ringkasan saldo keuangan (Total pendapatan, pengeluaran, tabungan, sisa uang riil & virtual, target, dan saran alokasi)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Bulan analitik (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tahun analitik
 *     responses:
 *       200:
 *         description: Ringkasan saldo keuangan berhasil diambil
 */
analyticsRoutes.get("/balance", getBalanceSummary);

/**
 * @swagger
 * /analytics/income-vs-expense:
 *   get:
 *     summary: Ambil tren pemasukan vs pengeluaran dalam rentang waktu tertentu
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [today, 7d, 30d, 3m, 6m, 12m, custom]
 *           default: 30d
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Tren berhasil diambil
 */
analyticsRoutes.get("/income-vs-expense", getIncomeVsExpenseTrend);

/**
 * @swagger
 * /analytics/expenses:
 *   get:
 *     summary: Ambil data analitik pengeluaran per kategori (Grafik)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [today, 7d, 30d, 3m, 6m, 12m, custom]
 *           default: 30d
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analitik pengeluaran berhasil diambil
 */
analyticsRoutes.get("/expenses", getExpenseAnalytics);

/**
 * @swagger
 * /analytics/comparison:
 *   get:
 *     summary: Perbandingan pengeluaran bulan ini vs bulan lalu
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perbandingan berhasil dihitung
 */
analyticsRoutes.get("/comparison", getExpenseComparison);
