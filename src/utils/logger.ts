import winston from "winston";
import path from "path";

// Tentukan folder penyimpanan file log
const logDirectory = path.join(process.cwd(), "logs");

// Tentukan format log di konsol (gaya lokal/dev: berwarna dan mudah dibaca)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  }),
);

// Tentukan format log di file (gaya production: JSON terstruktur)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Inisialisasi Winston Logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: prodFormat,
  transports: [
    // Simpan seluruh log gabungan (info, warn, error) ke logs/combined.log
    new winston.transports.File({
      filename: path.join(logDirectory, "combined.log"),
    }),
    // Simpan khusus log error ke logs/error.log
    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
    }),
  ],
});

// Jika bukan di production (lokal dev), tampilkan juga log ke Console dengan devFormat
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: devFormat,
    }),
  );
}

export default logger;
