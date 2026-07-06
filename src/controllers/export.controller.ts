import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

// Helper untuk menyaring expense berdasarkan bulan, tahun, kategori
const getFilteredExpenses = async (userId: string, month?: number, year?: number, category?: string) => {
  const where: any = { userId };

  if (category) {
    where.category = category;
  }

  if (month || year) {
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    where.date = {
      gte: new Date(targetYear, targetMonth - 1, 1),
      lt: new Date(targetYear, targetMonth, 1),
    };
  }

  return await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });
};

export const exportToExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const category = req.query.category as string | undefined;

    const expenses = await getFilteredExpenses(userId, month, year, category);

    // Format data untuk Excel
    const data = expenses.map((exp) => ({
      "ID Pengeluaran": exp.id,
      "Judul": exp.title,
      "Jumlah (Rp)": exp.amount,
      "Kategori": exp.category,
      "Tanggal": exp.date.toISOString().split("T")[0],
      "Catatan": exp.note || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pengeluaran");

    // Tulis ke buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan-pengeluaran-${Date.now()}.xlsx"`
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const exportToPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const category = req.query.category as string | undefined;

    const expenses = await getFilteredExpenses(userId, month, year, category);
    const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan-pengeluaran-${Date.now()}.pdf"`
    );

    doc.pipe(res);

    // Header Laporan
    doc.fontSize(20).font("Helvetica-Bold").text("LAPORAN PENGELUARAN", { align: "center" });
    doc.moveDown(0.5);

    const periodStr = month && year ? `${month}/${year}` : "Semua Periode";
    doc.fontSize(12).font("Helvetica").text(`Periode: ${periodStr}`, { align: "center" });
    doc.text(`Total Pengeluaran: Rp ${grandTotal.toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(2);

    // Garis Pemisah
    doc.strokeColor("#3b82f6").lineWidth(2).moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(1);

    // Header Tabel
    const tableTop = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Tanggal", 50, tableTop, { width: 80 });
    doc.text("Kategori", 140, tableTop, { width: 100 });
    doc.text("Judul", 250, tableTop, { width: 180 });
    doc.text("Jumlah", 440, tableTop, { width: 120, align: "right" });
    
    doc.moveDown(0.5);
    doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.5);

    // Konten Tabel
    doc.font("Helvetica");
    expenses.forEach((exp) => {
      // Pengecekan halaman baru jika y melebihi batas bawah halaman (misal 700)
      if (doc.y > 700) {
        doc.addPage();
        // Ulangi Header Tabel di Halaman Baru
        const newTableTop = doc.y;
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Tanggal", 50, newTableTop, { width: 80 });
        doc.text("Kategori", 140, newTableTop, { width: 100 });
        doc.text("Judul", 250, newTableTop, { width: 180 });
        doc.text("Jumlah", 440, newTableTop, { width: 120, align: "right" });
        doc.moveDown(0.5);
        doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font("Helvetica");
      }

      const currentY = doc.y;
      doc.text(exp.date.toISOString().split("T")[0], 50, currentY, { width: 80 });
      doc.text(exp.category, 140, currentY, { width: 100 });
      doc.text(exp.title, 250, currentY, { width: 180 });
      doc.text(`Rp ${exp.amount.toLocaleString("id-ID")}`, 440, currentY, { width: 120, align: "right" });
      doc.moveDown(1.2);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};
