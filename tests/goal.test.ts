import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Goals & Savings Heatmap Integration Tests", () => {
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

  describe("POST /api/goals - Create Goal", () => {
    it("should create a new goal successfully", async () => {
      const response = await request(app)
        .post("/api/goals")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Beli MacBook M4",
          targetAmount: 25000000,
          deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe("Beli MacBook M4");
      expect(response.body.data.targetAmount).toBe(25000000);
      expect(response.body.data.currentAmount).toBe(0);
    });

    it("should fail validation with invalid targetAmount", async () => {
      const response = await request(app)
        .post("/api/goals")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Beli MacBook M4",
          targetAmount: -100,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/goals/:id/savings - Add Saving Contribution", () => {
    it("should add saving log and increment goal currentAmount successfully", async () => {
      const createRes = await request(app)
        .post("/api/goals")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Liburan ke Jepang",
          targetAmount: 30000000,
        });

      const goalId = createRes.body.data.id;

      const response = await request(app)
        .post(`/api/goals/${goalId}/savings`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 500000,
          note: "Setoran pertama",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toBe(500000);

      const getGoalsRes = await request(app)
        .get("/api/goals")
        .set("Authorization", `Bearer ${token}`);

      const updatedGoal = getGoalsRes.body.data.find((g: any) => g.id === goalId);
      expect(updatedGoal.currentAmount).toBe(500000);
    });

    it("should return 404 for non-existent goal ID", async () => {
      const response = await request(app)
        .post("/api/goals/non-existent-id/savings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 100000,
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/goals/contributions - Get Savings Heatmap", () => {
    it("should aggregate contributions daily", async () => {
      const createRes = await request(app)
        .post("/api/goals")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Dana Darurat",
          targetAmount: 10000000,
        });

      const goalId = createRes.body.data.id;
      const testDate = new Date("2026-07-15T12:00:00.000Z").toISOString();

      await request(app)
        .post(`/api/goals/${goalId}/savings`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 200000,
          date: testDate,
        });

      await request(app)
        .post(`/api/goals/${goalId}/savings`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 300000,
          date: testDate,
        });

      const response = await request(app)
        .get("/api/goals/contributions")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);

      const targetDay = response.body.data.find((d: any) => d.date === "2026-07-15");
      expect(targetDay).toBeDefined();
      expect(targetDay.amount).toBe(500000);
      expect(targetDay.count).toBe(2);
    });
  });
});
