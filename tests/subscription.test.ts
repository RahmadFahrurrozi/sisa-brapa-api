import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Subscription Tracker Integration Tests", () => {
  let token: string;

  // Register and login to get JWT Token before each test
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

  describe("POST /api/subscriptions - Create Subscription", () => {
    it("should create a new subscription successfully", async () => {
      const response = await request(app)
        .post("/api/subscriptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Netflix",
          amount: 186000,
          billingCycle: "monthly",
          nextBillingDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          note: "Paket Premium 4K",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe("Netflix");
      expect(response.body.data.amount).toBe(186000);
      expect(response.body.data.billingCycle).toBe("monthly");
      expect(response.body.data.status).toBe("active");
    });

    it("should fail validation if name is missing", async () => {
      const response = await request(app)
        .post("/api/subscriptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 186000,
          billingCycle: "monthly",
          nextBillingDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validasi gagal");
    });

    it("should fail validation with invalid billing cycle", async () => {
      const response = await request(app)
        .post("/api/subscriptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Netflix",
          amount: 186000,
          billingCycle: "daily", // invalid, must be monthly, yearly, weakly
          nextBillingDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/subscriptions - Get Subscriptions", () => {
    it("should get active subscriptions for user", async () => {
      await request(app)
        .post("/api/subscriptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Spotify",
          amount: 54900,
          billingCycle: "monthly",
          nextBillingDate: new Date().toISOString(),
        });

      const response = await request(app)
        .get("/api/subscriptions")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("Spotify");
    });
  });

  describe("GET /api/subscriptions/:id - Get Subscription by ID", () => {
    it("should get details of a single subscription", async () => {
      const createRes = await request(app)
        .post("/api/subscriptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Disney+",
          amount: 79000,
          billingCycle: "monthly",
          nextBillingDate: new Date().toISOString(),
        });

      const id = createRes.body.data.id;

      const response = await request(app)
        .get(`/api/subscriptions/${id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(id);
      expect(response.body.data.name).toBe("Disney+");
    });
  });

  describe("DELETE /api/subscriptions/:id - Delete Subscription", () => {
    it("should delete subscription successfully", async () => {
      const createRes = await request(app)
        .post("/api/subscriptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Prime Video",
          amount: 59000,
          billingCycle: "monthly",
          nextBillingDate: new Date().toISOString(),
        });

      const id = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/subscriptions/${id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe("Successfullly delete subscription");

      // Verify it's gone
      const getRes = await request(app)
        .get(`/api/subscriptions/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(getRes.body.data).toBeNull();
    });

    it("should return 404 for non-existent subscription ID", async () => {
      const response = await request(app)
        .delete("/api/subscriptions/non-existent-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Subscription not found");
    });
  });
});
