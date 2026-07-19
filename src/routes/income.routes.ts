import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createIncomeSchema, updateIncomeSchema } from "../schemas/income.schema";
import { createIncomeTargetSchema } from "../schemas/income-target.schema";
import {
  createIncome,
  getAllIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
  getIncomeSummary,
  setIncomeTarget,
  getIncomeTarget,
} from "../controllers/income.controller";
import { exportIncomesToExcel, exportIncomesToPdf } from "../controllers/export.controller";

export const incomeRoutes = Router();

// Semua rute membutuhkan autentikasi token JWT
incomeRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Incomes
 *   description: API Manajemen Pendapatan / Pemasukan (Membutuhkan Bearer JWT Token)
 */

/**
 * @swagger
 * /incomes:
 *   post:
 *     summary: Catat pendapatan baru
 *     tags: [Incomes]
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
 *                 example: Gaji Bulanan PT Maju Jaya
 *               amount:
 *                 type: number
 *                 example: 8000000
 *               category:
 *                 type: string
 *                 enum: [salary, freelance, investment, gift, business, rental, refund, other]
 *                 example: salary
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-15T00:00:00.000Z
 *               note:
 *                 type: string
 *                 example: Bonus lemburan juga masuk sini
 *               walletId:
 *                 type: string
 *                 description: ID Dompet tujuan pemasukan (Opsional)
 *               autoSaveGoalId:
 *                 type: string
 *                 description: ID Goal Tabungan untuk auto-allocation (Opsional)
 *               autoSavePercentage:
 *                 type: number
 *                 description: Persentase alokasi otomatis (0-100) (Opsional)
 *     responses:
 *       201:
 *         description: Pendapatan berhasil dicatat
 *       400:
 *         description: Validasi input gagal
 */
incomeRoutes.post("/", validate(createIncomeSchema), createIncome);

/**
 * @swagger
 * /incomes:
 *   get:
 *     summary: Ambil daftar semua pendapatan user (pagination, filter, search)
 *     tags: [Incomes]
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
 *         name: category
 *         schema:
 *           type: string
 *           enum: [salary, freelance, investment, gift, business, rental, refund, other]
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daftar pendapatan berhasil diambil
 */
incomeRoutes.get("/", getAllIncomes);

/**
 * @swagger
 * /incomes/summary:
 *   get:
 *     summary: Rangkuman pendapatan bulanan berdasarkan kategori (Cached)
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rangkuman pemasukan berhasil diambil
 */
incomeRoutes.get("/summary", getIncomeSummary);

/**
 * @swagger
 * /incomes/targets:
 *   post:
 *     summary: Atur target pendapatan bulanan
 *     tags: [Incomes]
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
 *               - month
 *               - year
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 10000000
 *               month:
 *                 type: integer
 *                 example: 6
 *               year:
 *                 type: integer
 *                 example: 2025
 *     responses:
 *       200:
 *         description: Target pendapatan berhasil disimpan
 */
incomeRoutes.post("/targets", validate(createIncomeTargetSchema), setIncomeTarget);

/**
 * @swagger
 * /incomes/targets:
 *   get:
 *     summary: Ambil target pendapatan untuk bulan & tahun tertentu
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Target pemasukan berhasil diambil
 */
incomeRoutes.get("/targets", getIncomeTarget);

/**
 * @swagger
 * /incomes/export/excel:
 *   get:
 *     summary: Ekspor data pemasukan ke berkas Excel (.xlsx)
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berkas Excel berhasil diunduh
 */
incomeRoutes.get("/export/excel", exportIncomesToExcel);

/**
 * @swagger
 * /incomes/export/pdf:
 *   get:
 *     summary: Ekspor data pemasukan ke berkas PDF
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berkas PDF berhasil diunduh
 */
incomeRoutes.get("/export/pdf", exportIncomesToPdf);

/**
 * @swagger
 * /incomes/{id}:
 *   get:
 *     summary: Detail data pendapatan berdasarkan ID
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data pemasukan ditemukan
 *       404:
 *         description: Pemasukan tidak ditemukan
 */
incomeRoutes.get("/:id", getIncomeById);

/**
 * @swagger
 * /incomes/{id}:
 *   put:
 *     summary: Ubah data pendapatan berdasarkan ID
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [salary, freelance, investment, gift, business, rental, refund, other]
 *               date:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *               walletId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pendapatan berhasil diubah
 *       404:
 *         description: Pendapatan tidak ditemukan
 */
incomeRoutes.put("/:id", validate(updateIncomeSchema), updateIncome);

/**
 * @swagger
 * /incomes/{id}:
 *   delete:
 *     summary: Hapus catatan pendapatan berdasarkan ID
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pendapatan berhasil dihapus
 *       404:
 *         description: Pendapatan tidak ditemukan
 */
incomeRoutes.delete("/:id", deleteIncome);
