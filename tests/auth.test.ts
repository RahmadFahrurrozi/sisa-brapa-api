import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Authentication API Integration Tests", () => {
  describe("POST /api/auth/register", () => {
    it("should register user successfully and set cookie", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Budi Santoso",
          email: `budi-${Date.now()}@example.com`,
          password: "password123",
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Successfully Registered");
      expect(response.body.token).toBeDefined();

      // Pastikan ada header set-cookie untuk refresh token
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("refreshToken");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login user, return access token, and set refresh cookie", async () => {
      const email = `login-${Date.now()}@example.com`;

      await request(app).post("/api/auth/register").send({
        name: "Test User",
        email,
        password: "password123",
      });

      const response = await request(app).post("/api/auth/login").send({
        email,
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();

      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("refreshToken");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should successfully refresh access token using valid cookie", async () => {
      const email = `refresh-${Date.now()}@example.com`;

      const regRes = await request(app).post("/api/auth/register").send({
        name: "Refresh User",
        email,
        password: "password123",
      });

      // Ambil cookie dari response register
      const cookie = regRes.headers["set-cookie"];

      const response = await request(app).post("/api/auth/refresh").set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it("should return 401 if refresh cookie is missing", async () => {
      const response = await request(app).post("/api/auth/refresh");
      expect(response.status).toBe(401);
    });

    it("should return 401 if refresh cookie is invalid", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", ["refreshToken=palsu_expired_token; Path=/; HttpOnly"]);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully and clear cookie", async () => {
      const email = `logout-${Date.now()}@example.com`;

      const regRes = await request(app).post("/api/auth/register").send({
        name: "Logout User",
        email,
        password: "password123",
      });

      const token = regRes.body.token;
      const cookie = regRes.headers["set-cookie"];

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Successfully Logged Out");

      // Verifikasi cookie di-clear (max-age diset ke 0/expire lampau)
      const logoutCookies = response.headers["set-cookie"];
      expect(logoutCookies[0]).toContain("Expires=Thu, 01 Jan 1970");
    });
  });
});
