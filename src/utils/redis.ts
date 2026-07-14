import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

const redis = redisUrl
  ? new Redis(redisUrl, {
      // Aktifkan TLS/SSL untuk koneksi terenkripsi (seperti Upstash)
      tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
  : new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err));

export default redis;
