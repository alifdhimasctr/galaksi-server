// controllers/PaymentController.js
const express = require('express');
const router = express.Router();
const HonorService = require('../services/HonorService');
const ProshareService = require('../services/ProshareService');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Tentor, Mitra } = require('../models');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/transferproof'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});

const upload = multer({ storage });


router.put(
  '/honor/payment/:id',
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

router.put(
    '/proshare/payment/:id',
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

router.get('/honor/payment/pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;


    const honor = await HonorService.getHonorDetails(id);
    if (!honor) throw new Error("Honor tidak ditemukan");
    const tentor = await Tentor.findByPk(honor.tentorId); 
    if (!tentor) throw new Error("Tentor tidak ditemukan");

    const doc = new PDFDocument();
    const filePath = `./uploads/honor_${honor.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=honor_${honor.id}.pdf`);

    doc.pipe(res);  


    doc.fontSize(12).text('BIMBINGAN BELAJAR GALAKSI', { align: 'center' });
    doc.fontSize(10).text('Sahabat untuk Menjadi Cerdas', { align: 'center' });
    doc.fontSize(10).text('Tembalang Pesona Asri Blok A No. 24 Semarang', { align: 'center' });
    doc.fontSize(10).text('HP 081326334963', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(14).text('SLIP HONOR TENTOR', { align: 'center', underline: true });
    doc.moveDown(1);
 
   

  
    doc.fontSize(12).text(`Total     ${honor.total}`, { align: 'left' });

    doc.moveDown(2);
    doc.text(`Telah menerima honor tersebut di atas dari Bimbingan Belajar Antusias`, { align: 'left' });
    doc.text(`Via transfer ke : ${tentor.bankName} ${tentor.bankNumber} a.n ${tentor.name}`, { align: 'left' });
    doc.text(`pada tanggal ${honor.updatedAt}`, { align: 'left' });
    doc.moveDown(1);


    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/proshare/payment/pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;


    const proshare = await ProshareService.getProshareDetails(id);
    if (!proshare) throw new Error("Proshare tidak ditemukan");
    const mitra = await Mitra.findByPk(proshare.mitraId);
    if (!mitra) throw new Error("Mitra tidak ditemukan");


    const doc = new PDFDocument();
    const filePath = `./uploads/proshare_${proshare.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=proshare_${proshare.id}.pdf`);

    doc.pipe(res); 


    doc.fontSize(12).text('BIMBINGAN BELAJAR GALAKSI', { align: 'center' });
    doc.fontSize(10).text('Sahabat untuk Menjadi Cerdas', { align: 'center' });
    doc.fontSize(10).text('Tembalang Pesona Asri Blok A No. 24 Semarang', { align: 'center' });
    doc.fontSize(10).text('HP 081326334963', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(14).text('SLIP PROSHARE MITRA', { align: 'center', underline: true });
    doc.moveDown(1);

    doc.moveDown(2);
    
    doc.fontSize(12).text(`Total     ${proshare.total}`, { align: 'left' });

    doc.moveDown(2);
    doc.text(`Telah menerima proshare tersebut di atas dari Bimbingan Belajar Galaksi`, { align: 'left' });
    doc.text(`Via transfer ke : BRI 135401020061505 a.n MITRA GALAKSI`, { align: 'left' });
    doc.text(`pada tanggal ${new Date().toLocaleDateString()}`, { align: 'left' });
    doc.moveDown(1);


    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
