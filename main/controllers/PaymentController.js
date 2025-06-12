// controllers/PaymentController.js
const express = require('express');
const router = express.Router();
const HonorService = require('../services/HonorService');
const ProshareService = require('../services/ProshareService');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Tentor, Mitra } = require('../models');
const { processInvocePayment } = require('../services/InvoiceService');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/transferproof'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});

const upload = multer({ storage });


router.put('/honor/payment/:id',
  upload.single('transferProof'),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });

      const payment = await HonorService.processHonorPayment(id, req.file.path);
      res.status(200).json({
        message: 'Pembayaran honor berhasil diproses!',
        payment,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put('/proshare/payment/:id',
    upload.single('transferProof'),
    async (req, res) => {
      try {
        const { id } = req.params;
  
        if (!req.file) return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });
  
        const payment = await ProshareService.processProsharePayment(id, req.file.path);
        res.status(200).json({
          message: 'Pembayaran proshare berhasil diproses!',
          payment,
        });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
)

router.put('/invoice/payment/:id',
  upload.single('transferProof'),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });

      const payment = await processInvocePayment(id, req.file.path);
      res.status(200).json({
        message: 'Pembayaran invoice berhasil diproses!',
        payment,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);



module.exports = router;
