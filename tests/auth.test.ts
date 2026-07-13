import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("POST /api/auth/register", () => {
  it("should register user successfully with valid data", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Budi Santoso",
      email: "budi@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Successfully Registered");
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.email).toBe("budi@example.com");
  });

  it("should return 400 if email already exists", async () => {
    // Register pertama kali
    await request(app).post("/api/auth/register").send({
      name: "Budi",
      email: "budi@example.com",
      password: "pass123",
    });

    // Register kedua kali dengan email sama
    const response = await request(app).post("/api/auth/register").send({
      name: "Budi Dua",
      email: "budi@example.com",
      password: "pass456",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email already registered");
  });

  it("should return 400 if required fields missing", async () => {
    const response = await request(app).post("/api/auth/register").send({ name: "Budi" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validasi gagal");
  });
});

describe("POST /api/auth/logout", () => {
  it("should logout successfully and invalidate token", async () => {
    const email = `logoutuser-${Date.now()}@example.com`;

    // Register
    await request(app).post("/api/auth/register").send({
      name: "Logout User",
      email,
      password: "password123",
    });

    // Login
    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "password123",
    });

    const token = loginRes.body.token;

    // Logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe("Successfully Logged Out");

    // Try to access logout again (should fail because token is now blacklisted)
    const secondLogoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(secondLogoutRes.status).toBe(401);
  });

  it("should return 401 if token is missing", async () => {
    const response = await request(app).post("/api/auth/logout");
    expect(response.status).toBe(401);
  });
});
