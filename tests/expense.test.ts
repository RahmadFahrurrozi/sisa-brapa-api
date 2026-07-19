import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Expense and Budget Integration Tests", () => {
  let token: string;

  // Daftar dan login untuk mendapatkan JWT Token sebelum setiap pengujian
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

  describe("POST /api/expenses - Create Expense", () => {
    it("should create a new expense successfully", async () => {
      const response = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Makan Bakso",
          amount: 25000,
          category: "food",
          note: "Makan siang",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe("Makan Bakso");
      expect(response.body.data.amount).toBe(25000);
      expect(response.body.data.category).toBe("food");
    });

    it("should fail validation if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 25000,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/expenses - Get All with Filter & Sort", () => {
    it("should get user expenses with default pagination and sorting", async () => {
      // Buat data terlebih dahulu agar tidak kosong
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      const response = await request(app)
        .get("/api/expenses")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it("should filter by category", async () => {
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Ojek", amount: 15000, category: "transport" });

      const response = await request(app)
        .get("/api/expenses?category=food")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((e: any) => e.category === "food")).toBe(true);
      expect(response.body.data.length).toBe(1);
    });

    it("should sort dynamically by amount asc", async () => {
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Bensin", amount: 50000, category: "transport" });

      const response = await request(app)
        .get("/api/expenses?sortBy=amount&sortOrder=asc")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const amounts = response.body.data.map((e: any) => e.amount);
      expect(amounts[0]).toBe(20000);
      expect(amounts[1]).toBe(50000);
    });
  });

  describe("GET /api/expenses/:id - Get Expense by ID", () => {
    it("should return the correct expense", async () => {
      const createRes = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      const id = createRes.body.data.id;

      const response = await request(app)
        .get(`/api/expenses/${id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(id);
    });

    it("should return 404 for non-existent expense ID", async () => {
      const response = await request(app)
        .get("/api/expenses/non-existent-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/expenses/:id - Update Expense", () => {
    it("should update the expense details", async () => {
      const createRes = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      const id = createRes.body.data.id;

      const response = await request(app)
        .put(`/api/expenses/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Makan Mie Ayam",
          amount: 15000,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Makan Mie Ayam");
      expect(response.body.data.amount).toBe(15000);
    });
  });

  describe("GET /api/expenses/summary - Monthly Summary", () => {
    it("should return monthly summary", async () => {
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      const res = await request(app)
        .get("/api/expenses/summary")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.grandTotal).toBe(20000);
    });
  });

  describe("GET /api/expenses/analytics - Analytics Presets and Custom Ranges", () => {
    it("should get analytics with 30d range successfully", async () => {
      await request(app).post("/api/expenses").set("Authorization", `Bearer ${token}`).send({
        title: "Makan Siang",
        amount: 20000,
        category: "food",
        date: new Date().toISOString(),
      });

      const response = await request(app)
        .get("/api/expenses/analytics?range=30d")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalSpent).toBe(20000);
      expect(response.body.data.byCategory.food.total).toBe(20000);
      expect(response.body.data.trend).toBeInstanceOf(Array);
    });

    it("should fail analytics if custom range parameters are missing", async () => {
      const response = await request(app)
        .get("/api/expenses/analytics?range=custom")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it("should get analytics for custom date range", async () => {
      const createRes = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Makan Siang",
          amount: 20000,
          category: "food",
        });

      const expDate = new Date(createRes.body.data.date);
      const year = expDate.getFullYear();
      const month = String(expDate.getMonth() + 1).padStart(2, "0");
      const date = String(expDate.getDate()).padStart(2, "0");
      const localDateStr = `${year}-${month}-${date}`;

      const response = await request(app)
        .get(
          `/api/expenses/analytics?range=custom&startDate=${localDateStr}&endDate=${localDateStr}`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalSpent).toBe(20000);
    });
  });

  describe("GET /api/expenses/comparison - Monthly Expense Comparison", () => {
    it("should calculate comparison statistics successfully", async () => {
      // Tambah expense untuk bulan ini
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      const response = await request(app)
        .get("/api/expenses/comparison")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.currentPeriod).toBeDefined();
      expect(response.body.data.previousPeriod).toBeDefined();
      expect(response.body.data.differencePercentage).toBeDefined();
      expect(response.body.data.status).toBeDefined();
    });
  });

  describe("POST /api/budgets & GET /api/budgets/status - Budgeting Feature", () => {
    it("should configure a budget limit", async () => {
      const response = await request(app)
        .post("/api/budgets")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 500000,
          category: "food",
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.amount).toBe(500000);
    });

    it("should fetch budget status and calculate remaining and percentage", async () => {
      // Setel budget
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      await request(app).post("/api/budgets").set("Authorization", `Bearer ${token}`).send({
        amount: 100000,
        category: "food",
        month: currentMonth,
        year: currentYear,
      });

      // Tambahkan pengeluaran
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      const response = await request(app)
        .get(`/api/budgets/status?month=${currentMonth}&year=${currentYear}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0].category).toBe("food");
      expect(response.body.data[0].spent).toBe(20000);
      expect(response.body.data[0].remaining).toBe(80000);
      expect(response.body.data[0].percentage).toBe(20);
    });
  });

  describe("GET /api/budgets/alerts - Budget Alerts", () => {
    it("should return alerts when budget spending reaches 80%", async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // 1. Set budget yang kecil agar mudah terlewati (misal limit 25,000)
      await request(app).post("/api/budgets").set("Authorization", `Bearer ${token}`).send({
        amount: 25000,
        category: "food",
        month: currentMonth,
        year: currentYear,
      });

      // 2. Tambahkan pengeluaran yang melebihi 80% (misal 20,000 dari limit 25,000 = 80%)
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Bakso", amount: 20000, category: "food" });

      const response = await request(app)
        .get("/api/budgets/alerts")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].category).toBe("food");
      expect(response.body.data[0].level).toBe("warning");
    });

    it("should return alert danger when budget spending reaches 100%", async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // 1. Set budget 25,000
      await request(app).post("/api/budgets").set("Authorization", `Bearer ${token}`).send({
        amount: 25000,
        category: "food",
        month: currentMonth,
        year: currentYear,
      });

      // 2. Tambahkan pengeluaran 30,000 (melebihi limit 25,000)
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Mewah", amount: 30000, category: "food" });

      const response = await request(app)
        .get("/api/budgets/alerts")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].level).toBe("danger");
    });
  });

  describe("GET /api/expenses/export - Report Exports", () => {
    it("should export expenses to excel buffer", async () => {
      const response = await request(app)
        .get("/api/expenses/export/excel")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("spreadsheetml.sheet");
    });

    it("should export expenses to pdf buffer", async () => {
      const response = await request(app)
        .get("/api/expenses/export/pdf")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/pdf");
    });
  });

  describe("DELETE /api/expenses/:id - Delete Expense", () => {
    it("should delete the expense", async () => {
      const createRes = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan Siang", amount: 20000, category: "food" });

      const id = createRes.body.data.id;

      const response = await request(app)
        .delete(`/api/expenses/${id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });
});
