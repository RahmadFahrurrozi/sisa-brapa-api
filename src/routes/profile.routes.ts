import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { updateProfileSchema } from "../schemas/profile.schema";

export const profileRoutes = Router();

// Semua rute profil memerlukan autentikasi token
profileRoutes.use(authMiddleware);

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Mendapatkan profil lengkap pengguna beserta insights finansial
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil profil pengguna
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
 *                   example: Profil pengguna berhasil diambil
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     joinedSince:
 *                       type: string
 *                       example: Juli 2026
 *                     profile:
 *                       type: object
 *                       properties:
 *                         bio:
 *                           type: string
 *                         avatarUrl:
 *                           type: string
 *                         occupation:
 *                           type: string
 *                         monthlyIncomeEst:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         language:
 *                           type: string
 *                         birthDate:
 *                           type: string
 *                           format: date-time
 *                         financialType:
 *                           type: string
 *                         phoneNumber:
 *                           type: string
 *                         address:
 *                           type: string
 *                     financialOverview:
 *                       type: object
 *                       properties:
 *                         totalWallets:
 *                           type: integer
 *                         totalActiveGoals:
 *                           type: integer
 *                         totalSubscriptions:
 *                           type: integer
 *                         savingsRatio:
 *                           type: integer
 *                         financialHealthScore:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User tidak ditemukan
 */
profileRoutes.get("/", getProfile);

/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Memperbarui data profil dan nama pengguna
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rozi Baru
 *               bio:
 *                 type: string
 *                 example: Frugal living, early retirement!
 *               avatarUrl:
 *                 type: string
 *                 example: https://picsum.photos/200
 *               occupation:
 *                 type: string
 *                 example: Software Engineer
 *               monthlyIncomeEst:
 *                 type: number
 *                 example: 15000000
 *               currency:
 *                 type: string
 *                 example: IDR
 *               language:
 *                 type: string
 *                 example: id
 *               birthDate:
 *                 type: string
 *                 format: date-time
 *                 example: 1998-05-12T00:00:00.000Z
 *               financialType:
 *                 type: string
 *                 enum: [frugal, spender, investor, balanced]
 *                 example: investor
 *               phoneNumber:
 *                 type: string
 *                 example: "081234567890"
 *               address:
 *                 type: string
 *                 example: Jakarta, Indonesia
 *     responses:
 *       200:
 *         description: Profil pengguna berhasil diperbarui
 *       400:
 *         description: Bad Request (Validasi gagal)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User tidak ditemukan
 */
profileRoutes.put("/", validate(updateProfileSchema), updateProfile);
