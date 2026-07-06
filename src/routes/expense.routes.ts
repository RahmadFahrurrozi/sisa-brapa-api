import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createExpenseSchema,
  updateExpenseSchema,
} from "../schemas/expense.schema";
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from "../controllers/expense.controller";
import { getExpenseAnalytics } from "../controllers/analytics.controller";
import { exportToExcel, exportToPdf } from "../controllers/export.controller";

export const expenseRoutes = Router();

// Pasang authMiddleware di level Router
// Semua endpoint di bawah ini membutuhkan token JWT valid
expenseRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: API Pencatatan Pengeluaran (Membutuhkan Bearer JWT Token)
 */

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Ambil semua pengeluaran user (mendukung pagination, filter, dan search)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Halaman data yang ingin diambil
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Jumlah data per halaman
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, transport, entertainment, health, other]
 *         description: Filter berdasarkan kategori
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan bulan (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan tahun
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari berdasarkan judul pengeluaran (case-insensitive)
 *     responses:
 *       200:
 *         description: Daftar pengeluaran berhasil diambil
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.get("/", getAllExpenses);

/**
 * @swagger
 * /expenses/summary:
 *   get:
 *     summary: Ambil ringkasan pengeluaran bulanan per kategori (Cached di Redis)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Bulan ringkasan (default bulan saat ini)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tahun ringkasan (default tahun saat ini)
 *     responses:
 *       200:
 *         description: Ringkasan berhasil diambil
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.get("/summary", getExpenseSummary);

/**
 * @swagger
 * /expenses/analytics:
 *   get:
 *     summary: Ambil data analytics dan trend pengeluaran user (Grafik)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [today, 7d, 30d, 3m, 6m, 12m, custom]
 *           default: 30d
 *         description: Rentang waktu rangkuman trend
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal mulai (untuk range=custom, format YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal selesai (untuk range=custom, format YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Data analytics berhasil diambil
 *       400:
 *         description: Parameter tidak valid
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.get("/analytics", getExpenseAnalytics);

/**
 * @swagger
 * /expenses/export/excel:
 *   get:
 *     summary: Ekspor pengeluaran ke berkas Excel (.xlsx)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Bulan data yang akan diekspor (opsional)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tahun data yang akan diekspor (opsional)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Kategori yang akan diekspor (opsional)
 *     responses:
 *       200:
 *         description: Berkas Excel berhasil diunduh
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.get("/export/excel", exportToExcel);

/**
 * @swagger
 * /expenses/export/pdf:
 *   get:
 *     summary: Ekspor pengeluaran ke berkas PDF
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Bulan data yang akan diekspor (opsional)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tahun data yang akan diekspor (opsional)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Kategori yang akan diekspor (opsional)
 *     responses:
 *       200:
 *         description: Berkas PDF berhasil diunduh
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.get("/export/pdf", exportToPdf);

/**
 * @swagger
 * /expenses/{id}:
 *   get:
 *     summary: Ambil pengeluaran berdasarkan ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID pengeluaran
 *     responses:
 *       200:
 *         description: Data pengeluaran ditemukan
 *       404:
 *         description: Data tidak ditemukan
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.get("/:id", getExpenseById);

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Catat pengeluaran baru
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - amount
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: Makan Nasi Padang
 *               amount:
 *                 type: number
 *                 example: 25000
 *               category:
 *                 type: string
 *                 enum: [food, transport, entertainment, health, other]
 *                 example: food
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-15T00:00:00.000Z
 *               note:
 *                 type: string
 *                 example: Makan siang bersama tim
 *     responses:
 *       201:
 *         description: Pengeluaran berhasil dibuat
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.post("/", validate(createExpenseSchema), createExpense);

/**
 * @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Update data pengeluaran berdasarkan ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID pengeluaran
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [food, transport, entertainment, health, other]
 *               date:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pengeluaran berhasil diperbarui
 *       400:
 *         description: Validasi gagal
 *       404:
 *         description: Pengeluaran tidak ditemukan
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.put("/:id", validate(updateExpenseSchema), updateExpense);

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Hapus pengeluaran berdasarkan ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID pengeluaran
 *     responses:
 *       200:
 *         description: Pengeluaran berhasil dihapus
 *       404:
 *         description: Pengeluaran tidak ditemukan
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
expenseRoutes.delete("/:id", deleteExpense);
