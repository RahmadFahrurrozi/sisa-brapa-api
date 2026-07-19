import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Income, Target, and Balance Analytics Integration Tests", () => {
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

  describe("POST /api/incomes - Record Income", () => {
    it("should record income successfully without wallet or goal", async () => {
      const response = await request(app)
        .post("/api/incomes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Freelance Design",
          amount: 1500000,
          category: "freelance",
          note: "Logo project",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.income.title).toBe("Freelance Design");
      expect(response.body.data.income.amount).toBe(1500000);
      expect(response.body.data.income.category).toBe("freelance");
    });

    it("should update wallet balance upon recording income", async () => {
      const walletRes = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "GoPay", type: "e_wallet", provider: "GoPay", balance: 50000 });

      const walletId = walletRes.body.data.id;

      const response = await request(app)
        .post("/api/incomes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Freelance",
          amount: 200000,
          category: "freelance",
          walletId,
        });

      expect(response.status).toBe(201);

      // Verifikasi saldo wallet bertambah
      const updatedWalletRes = await request(app)
        .get(`/api/wallets/${walletId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(updatedWalletRes.body.data.balance).toBe(250000); // 50rb + 200rb
    });

    it("should execute auto-allocation to saving goals", async () => {
      // 1. Buat Saving Goal terlebih dahulu
      const goalRes = await request(app)
        .post("/api/goals")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Dana Darurat",
          targetAmount: 5000000,
          currentAmount: 1000000,
        });

      const goalId = goalRes.body.data.id;

      const response = await request(app)
        .post("/api/incomes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Gajian",
          amount: 1000000,
          category: "salary",
          autoSaveGoalId: goalId,
          autoSavePercentage: 20, // 20% dari 1jt = 200rb
        });

      expect(response.status).toBe(201);
      expect(response.body.data.autoSaveLog).toBeDefined();
      expect(response.body.data.autoSaveLog.amount).toBe(200000);

      // Verifikasi saving goal progress bertambah
      const updatedGoalsRes = await request(app)
        .get("/api/goals")
        .set("Authorization", `Bearer ${token}`);

      const updatedGoal = updatedGoalsRes.body.data.find((g: any) => g.id === goalId);
      expect(updatedGoal).toBeDefined();
      expect(updatedGoal.currentAmount).toBe(200000); // 0 + 200rb (karena goal baru selalu diinisialisasi dengan currentAmount = 0)
    });
  });

  describe("PUT /api/incomes/:id - Update Income Wallet and Amount", () => {
    it("should correctly re-adjust wallet balances when income details change", async () => {
      const walletRes1 = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BCA", type: "bank", provider: "BCA", balance: 1000 });

      const walletRes2 = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "GoPay", type: "e_wallet", provider: "GoPay", balance: 500 });

      const w1 = walletRes1.body.data.id;
      const w2 = walletRes2.body.data.id;

      const incRes = await request(app)
        .post("/api/incomes")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Gaji", amount: 400, category: "salary", walletId: w1 });

      const incomeId = incRes.body.data.income.id;

      // Ubah dari BCA ke GoPay, dan ubah nominal dari 400 ke 600
      const updateRes = await request(app)
        .put(`/api/incomes/${incomeId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 600, walletId: w2 });

      expect(updateRes.status).toBe(200);

      // BCA harus berkurang kembali (kembali ke saldo awal 1000)
      const bcaRes = await request(app)
        .get(`/api/wallets/${w1}`)
        .set("Authorization", `Bearer ${token}`);
      expect(bcaRes.body.data.balance).toBe(1000);

      // GoPay harus bertambah 600 (500 + 600 = 1100)
      const gopayRes = await request(app)
        .get(`/api/wallets/${w2}`)
        .set("Authorization", `Bearer ${token}`);
      expect(gopayRes.body.data.balance).toBe(1100);
    });
  });

  describe("POST /api/incomes/targets - Income Target", () => {
    it("should set and retrieve monthly income targets", async () => {
      const setRes = await request(app)
        .post("/api/incomes/targets")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 15000000, month: 7, year: 2026 });

      expect(setRes.status).toBe(200);
      expect(setRes.body.data.amount).toBe(15000000);

      const getRes = await request(app)
        .get("/api/incomes/targets?month=7&year=2026")
        .set("Authorization", `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.amount).toBe(15000000);
    });
  });

  describe("GET /api/analytics/balance - Dashboard Balance Summary", () => {
    it("should compute accurate balance breakdown", async () => {
      // 1. Buat Wallet
      const wRes = await request(app)
        .post("/api/wallets")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BCA", type: "bank", provider: "BCA", balance: 0 });
      const wId = wRes.body.data.id;

      // 2. Buat Pemasukan
      await request(app)
        .post("/api/incomes")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Gajian", amount: 10000, category: "salary", walletId: wId });

      // 3. Buat Pengeluaran
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Makan", amount: 4000, category: "food", walletId: wId });

      // 4. Request balance summary
      const response = await request(app)
        .get("/api/analytics/balance")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalIncome).toBe(10000);
      expect(response.body.data.totalExpense).toBe(4000);
      expect(response.body.data.remainingBalance).toBe(6000);
      expect(response.body.data.totalWalletBalance).toBe(6000);
      expect(response.body.data.allocation503020.needs).toBe(5000);
    });
  });

  describe("GET /api/transactions - Unified transactions timeline", () => {
    it("should retrieve combined incomes and expenses chronologically", async () => {
      // 1. Buat Income
      await request(app)
        .post("/api/incomes")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Freelance", amount: 300, category: "freelance" });

      // 2. Buat Expense
      await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Bakso", amount: 50, category: "food" });

      const response = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].type).toBeDefined(); // must contain "income" or "expense"
    });
  });
});
