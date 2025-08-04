// controllers/PaymentController.js
const express = require('express');
const router = express.Router();
const HonorService = require('../services/HonorService');
const ProshareService = require('../services/ProshareService');
const PDFDocument = require('pdfkit');
const { Tentor, Mitra } = require('../models');
const { processInvocePayment } = require('../services/InvoiceService');
const { uploadMiddleware, handleCloudinaryUploadSingle } = require('../../helper/upload');

// Honor payment with transfer proof upload
router.put('/honor/payment/:id',
  uploadMiddleware.single('transferProof'), // Use uploadMiddleware instead of multer
  handleCloudinaryUploadSingle, // Upload to Cloudinary
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });
      }

      // Pass Cloudinary URL instead of local file path
      const payment = await HonorService.processHonorPayment(id, req.file.cloudinaryUrl);
      
      res.status(200).json({
        message: 'Pembayaran honor berhasil diproses!',
        payment,
      });
    } catch (error) {
      console.error('Honor payment error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Proshare payment with transfer proof upload
router.put('/proshare/payment/:id',
  uploadMiddleware.single('transferProof'), // Use uploadMiddleware instead of multer
  handleCloudinaryUploadSingle, // Upload to Cloudinary
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });
      }

      // Pass Cloudinary URL instead of local file path
      const payment = await ProshareService.processProsharePayment(id, req.file.cloudinaryUrl);
      
      res.status(200).json({
        message: 'Pembayaran proshare berhasil diproses!',
        payment,
      });
    } catch (error) {
      console.error('Proshare payment error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Invoice payment with transfer proof upload
router.put('/invoice/payment/:id',
  uploadMiddleware.single('transferProof'), // Use uploadMiddleware instead of multer
  handleCloudinaryUploadSingle, // Upload to Cloudinary
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });
      }

      // Pass Cloudinary URL instead of local file path
      const payment = await processInvocePayment(id, req.file.cloudinaryUrl);
      
      res.status(200).json({
        message: 'Pembayaran invoice berhasil diproses!',
        payment,
      });
    } catch (error) {
      console.error('Invoice payment error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;