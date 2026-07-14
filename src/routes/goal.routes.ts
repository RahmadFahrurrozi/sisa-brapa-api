import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

import {
  createGoal,
  getGoals,
  addSaving,
  getSavingsContributions,
} from "../controllers/goal.controller";
import { addSavingSchema, createGoalSchema } from "../schemas/goal..schema";

export const goalRoutes = Router();

// Proteksi semua endpoint di router ini
goalRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Goals
 *   description: API Tabungan & Target Keuangan (Membutuhkan Bearer JWT Token)
 */

/**
 * @swagger
 * /goals:
 *   post:
 *     summary: Membuat target tabungan (goal) baru
 *     tags: [Goals]
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
 *               - targetAmount
 *             properties:
 *               name:
 *                 type: string
 *                 example: Beli MacBook Pro M4
 *                 description: Nama target tabungan
 *               targetAmount:
 *                 type: number
 *                 example: 25000000
 *                 description: Jumlah uang yang ingin dicapai
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-12-31T23:59:59.000Z"
 *                 description: Tenggat waktu pencapaian (opsional)
 *     responses:
 *       201:
 *         description: Target tabungan berhasil dibuat
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
goalRoutes.post("/", validate(createGoalSchema), createGoal);

/**
 * @swagger
 * /goals:
 *   get:
 *     summary: Mengambil semua daftar target tabungan (goals) milik user
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar target tabungan
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
goalRoutes.get("/", getGoals);

/**
 * @swagger
 * /goals/{id}/savings:
 *   post:
 *     summary: Menambah setoran tabungan (saving contribution) ke target tertentu
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dari target tabungan (Goal ID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500000
 *                 description: Jumlah uang yang disetor
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-07-14T12:00:00.000Z"
 *                 description: Tanggal kontribusi (opsional, default waktu sekarang)
 *               note:
 *                 type: string
 *                 example: Setoran awal bulan
 *                 description: Catatan opsional
 *     responses:
 *       201:
 *         description: Setoran tabungan berhasil dicatat dan memperbarui Goal
 *       400:
 *         description: Validasi input gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Target tabungan (Goal) tidak ditemukan
 */
goalRoutes.post("/:id/savings", validate(addSavingSchema), addSaving);

/**
 * @swagger
 * /goals/contributions:
 *   get:
 *     summary: Mengambil data akumulasi kontribusi menabung harian untuk grafik heatmap ala GitHub
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data kontribusi harian
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
 *                   example: success get savings contributions
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: "2026-07-14"
 *                         description: Tanggal kontribusi (YYYY-MM-DD)
 *                       amount:
 *                         type: number
 *                         example: 500000
 *                         description: Total akumulasi nominal tabungan di hari tersebut
 *                       count:
 *                         type: integer
 *                         example: 2
 *                         description: Jumlah frekuensi setoran di hari tersebut
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
goalRoutes.get("/contributions", getSavingsContributions);
