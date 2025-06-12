const express = require("express");
const router = express.Router();
const InvoiceService = require("../services/InvoiceService");
const { authMiddleware } = require("../../middleware");
const fs = require("fs");
const path = require("path");

router.get("/invoices", authMiddleware, async (req, res) => {
  try {
    const {siswaId, status} = req.query; // Get query parameters
    const filters = {};
    if (siswaId) {
      filters.siswaId = siswaId; // Add siswaId to filters if provided
    }
    if (status) {
      filters.status = status; // Add status to filters if provided
    }
    const invoices = await InvoiceService.getAllInvoices(filters);
    res.status(200).json(invoices);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/invoices/:status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.params; // Get the status parameter from the query string
    const invoices = await InvoiceService.getAllInvoices(status); // Pass the status to the service
    res.status(200).json(invoices);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/invoice/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await InvoiceService.getInvoiceDetails(id);
    res.status(200).json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/invoice/pdf/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Generate PDF
    const filePath = await InvoiceService.generateInvoicePdf(id);

    // Set header untuk response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${id}.pdf`
    );

    // Stream file ke response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Hapus file sementara setelah dikirim
    fileStream.on("end", () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Gagal menghapus file sementara:", err);
      });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
