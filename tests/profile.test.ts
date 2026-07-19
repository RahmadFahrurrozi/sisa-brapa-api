import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Profile Integration Tests", () => {
  let token: string;
  let userEmail: string;

  beforeEach(async () => {
    userEmail = `testuser-${Date.now()}@example.com`;

    // 1. Registrasi otomatis membuat profil
    await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: userEmail,
      password: "password123",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: userEmail,
      password: "password123",
    });

    token = loginRes.body.token;
  });

  describe("GET /api/profile", () => {
    it("should retrieve profile details and dynamic financial insights successfully", async () => {
      const response = await request(app)
        .get("/api/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("Test User");
      expect(response.body.data.email).toBe(userEmail);
      expect(response.body.data.profile.currency).toBe("IDR");
      expect(response.body.data.profile.language).toBe("id");
      expect(response.body.data.profile.financialType).toBe("balanced");
      expect(response.body.data.financialOverview.totalWallets).toBe(0);
      expect(response.body.data.financialOverview.totalActiveGoals).toBe(0);
      expect(response.body.data.financialOverview.totalSubscriptions).toBe(0);
      expect(response.body.data.financialOverview.savingsRatio).toBe(0);
      expect(response.body.data.financialOverview.financialHealthScore).toBe(100); // Bersih/Tanpa pengeluaran
    });

    it("should calculate correct health score when expenses exist", async () => {
      // 1. Set estimasi pendapatan bulanan ke 10.000.000
      await request(app).put("/api/profile").set("Authorization", `Bearer ${token}`).send({
        monthlyIncomeEst: 10000000,
      });

      // 2. Buat pengeluaran 4.000.000 (40% dari estimasi pendapatan)
      await request(app).post("/api/expenses").set("Authorization", `Bearer ${token}`).send({
        title: "Sewa Kosan",
        amount: 4000000,
        category: "housing",
        date: new Date().toISOString(),
      });

      const response = await request(app)
        .get("/api/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile.monthlyIncomeEst).toBe(10000000);
      // Rasio pengeluaran: 40% (masuk kategori 30% - 60%). Rumus: 85 - (0.4 - 0.3) * 100 = 75
      expect(response.body.data.financialOverview.financialHealthScore).toBe(75);
    });
  });

  describe("PUT /api/profile", () => {
    it("should update basic user data and profile fields successfully", async () => {
      const response = await request(app)
        .put("/api/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Rozi Baru",
          bio: "Frugal living!",
          occupation: "Tech Entrepreneur",
          monthlyIncomeEst: 15000000,
          currency: "USD",
          language: "en",
          birthDate: "1998-05-12T00:00:00.000Z",
          financialType: "investor",
          phoneNumber: "081234567890",
          address: "Jakarta, Indonesia",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("Rozi Baru");
      expect(response.body.data.profile.bio).toBe("Frugal living!");
      expect(response.body.data.profile.occupation).toBe("Tech Entrepreneur");
      expect(response.body.data.profile.monthlyIncomeEst).toBe(15000000);
      expect(response.body.data.profile.currency).toBe("USD");
      expect(response.body.data.profile.language).toBe("en");
      expect(response.body.data.profile.birthDate).toBe("1998-05-12T00:00:00.000Z");
      expect(response.body.data.profile.financialType).toBe("investor");
      expect(response.body.data.profile.phoneNumber).toBe("081234567890");
      expect(response.body.data.profile.address).toBe("Jakarta, Indonesia");
    });

    it("should fail validation if field formats are incorrect", async () => {
      const response = await request(app)
        .put("/api/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          avatarUrl: "invalid-url",
          monthlyIncomeEst: -500,
          financialType: "invalid-type",
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });
  });
});
