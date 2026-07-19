import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Wallet Integration Tests", () => {
  let token: string;

  beforeEach(async () => {
    const email = `testuser-${Date.now()}@example.com`;

    await request(app).post("/api/auth/register").send({
      name: "Test User",
      email,
      password: "password123",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "password123",
    });

    token = loginRes.body.token;
  });

  describe("POST /api/wallets - Create Wallet", () => {
    it("should create a new wallet successfully", async () => {
      const response = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "BCA Tabungan",
          type: "bank",
          provider: "BCA",
          balance: 500000,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe("BCA Tabungan");
      expect(response.body.data.type).toBe("bank");
      expect(response.body.data.provider).toBe("BCA");
      expect(response.body.data.balance).toBe(500000);
    });

    it("should fail validation if type or provider is invalid", async () => {
      const response = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "BCA Tabungan",
          type: "wrong_type",
          provider: "wrong_provider",
        });

      expect(response.status).toBe(400);
    });

    it("should fail if duplicate wallet name is used", async () => {
      await request(app).post("/api/wallets").set("Authorization", `Bearer ${token}`).send({
        name: "BCA Tabungan",
        type: "bank",
        provider: "BCA",
        balance: 100000,
      });

      const response = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "bca tabungan", // case-insensitive check
          type: "bank",
          provider: "BCA",
          balance: 200000,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/wallets - Get All", () => {
    it("should get all wallets of user", async () => {
      await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BCA", type: "bank", provider: "BCA", balance: 100 });

      await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "GoPay", type: "e_wallet", provider: "GoPay", balance: 50 });

      const response = await request(app)
        .get("/api/wallets")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe("PUT /api/wallets/:id - Update Wallet", () => {
    it("should update wallet name successfully", async () => {
      const createRes = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BCA", type: "bank", provider: "BCA", balance: 100 });

      const walletId = createRes.body.data.id;

      const response = await request(app)
        .put(`/api/wallets/${walletId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BCA Updated" });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("BCA Updated");
    });
  });

  describe("DELETE /api/wallets/:id - Delete Wallet", () => {
    it("should delete wallet successfully", async () => {
      const createRes = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BCA", type: "bank", provider: "BCA", balance: 100 });

      const walletId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/wallets/${walletId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);

      const getRes = await request(app)
        .get(`/api/wallets/${walletId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(getRes.status).toBe(404);
    });
  });
});
