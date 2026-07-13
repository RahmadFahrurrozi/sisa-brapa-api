import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSubscriptionSchema } from "../schemas/subscription.schema";
import {
  createSubscription,
  getSubscriptions,
  getOneSubscription,
  deleteSubscription,
} from "../controllers/subscription.controller";

export const subscriptionRoutes = Router();

// Proteksi semua endpoint subscription
subscriptionRoutes.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: API Subscription Tracker (Membutuhkan Bearer JWT Token)
 */

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Membuat subscription baru
 *     tags: [Subscriptions]
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
 *               - amount
 *               - billingCycle
 *               - nextBillingDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: Netflix
 *               amount:
 *                 type: number
 *                 example: 186000
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, weakly]
 *                 example: monthly
 *               nextBillingDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-13T00:00:00.000Z"
 *               note:
 *                 type: string
 *                 example: Paket Premium 4K
 *     responses:
 *       201:
 *         description: Subscription berhasil dibuat
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
subscriptionRoutes.post("/", validate(createSubscriptionSchema), createSubscription);

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Mengambil semua subscription aktif milik user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar subscription
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
subscriptionRoutes.get("/", getSubscriptions);

/**
 * @swagger
 * /subscriptions/{id}:
 *   get:
 *     summary: Mengambil satu subscription berdasarkan ID
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dari subscription
 *     responses:
 *       200:
 *         description: Berhasil mengambil data subscription
 *       404:
 *         description: Subscription tidak ditemukan
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
subscriptionRoutes.get("/:id", getOneSubscription);

/**
 * @swagger
 * /subscriptions/{id}:
 *   delete:
 *     summary: Menghapus/membatalkan subscription berdasarkan ID
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dari subscription
 *     responses:
 *       200:
 *         description: Subscription berhasil dihapus
 *       404:
 *         description: Subscription tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Subscription not found
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
subscriptionRoutes.delete("/:id", deleteSubscription);
