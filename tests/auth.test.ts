import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("POST /api/auth/register", () => {
  it("should register user successfully with valid data", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Budi Santoso",
        email: "budi@example.com",
        password: "password123"
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Registrasi berhasil");
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.email).toBe("budi@example.com");
  });

  it("should return 400 if email already exists", async () => {
    // Register pertama kali
    await request(app).post("/api/auth/register").send({
      name: "Budi", email: "budi@example.com", password: "pass123"
    });

    // Register kedua kali dengan email sama
    const response = await request(app).post("/api/auth/register").send({
      name: "Budi Dua", email: "budi@example.com", password: "pass456"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Email sudah terdaftar");
  });

  it("should return 400 if required fields missing", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Budi" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validasi gagal");
  });
});
