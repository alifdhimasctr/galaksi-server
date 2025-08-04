// services/ProshareService.js
const { Proshare, Mitra, Invoice, Siswa, Paket } = require('../models');
const db = require("../../database/db");
const PDFDocument = require('pdfkit');
const path = require("path");
const fs = require("fs").promises;

const processProsharePayment = async (proshareId, transferProof) => {
  const t = await db.transaction();

  try {
    const proshare = await Proshare.findByPk(proshareId, { transaction: t });
    if (!proshare) throw new Error("Proshare tidak ditemukan");

    proshare.paymentStatus = 'Paid';
    proshare.paymentDate = new Date();
    proshare.transferProof = transferProof;
    await proshare.save({ transaction: t });

    const amount = proshare.total;

    const mitra = await Mitra.findByPk(proshare.mitraId, { transaction: t });
    if (!mitra) throw new Error("Mitra tidak ditemukan");
    mitra.wallet -= amount; 
    await mitra.save({ transaction: t });

    await t.commit();
    return proshare;
  } catch (error) {
    await t.rollback();
    throw new Error(`Pembayaran Proshare gagal: ${error.message}`);
  }
};

const getAllProshares = async (filters = {}) => {
  try {
    const whereClause = {};
    if (filters.mitraId) {
      whereClause.mitraId = filters.mitraId;
    }
    
    const proshares = await Proshare.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']],
    });
    
    const proshareDetails = await Promise.all(
      proshares.map(async (proshare) => {
        const mitra = await Mitra.findByPk(proshare.mitraId);
        const siswa = await Siswa.findByPk(proshare.siswaId);
        const invoice = await Invoice.findByPk(proshare.invoiceId);
        const paket = invoice ? await Paket.findByPk(invoice.paketId) : null;
        
        return {
          ...proshare.toJSON(),
          mitra: mitra ? mitra.toJSON() : null,
          siswa: siswa ? siswa.toJSON() : null,
          invoice: invoice ? invoice.toJSON() : null,
          paket: paket ? paket.toJSON() : null
        };
      })
    );

    return proshareDetails;
  } catch (error) {
    throw new Error(`Error saat mengambil semua proshare: ${error.message}`);
  }
};

const getProshareDetails = async (proshareId) => {
  try {
    const proshare = await Proshare.findByPk(proshareId);
    if (!proshare) throw new Error("Proshare tidak ditemukan");

    const mitra = await Mitra.findByPk(proshare.mitraId);
    const siswa = await Siswa.findByPk(proshare.siswaId);
    const invoice = await Invoice.findByPk(proshare.invoiceId);
    const paket = invoice ? await Paket.findByPk(invoice.paketId) : null;

    return {
      ...proshare.toJSON(),
      mitra: mitra ? mitra.toJSON() : null,
      siswa: siswa ? siswa.toJSON() : null,
      invoice: invoice ? invoice.toJSON() : null,
      paket: paket ? paket.toJSON() : null
    };
  } catch (error) {
    throw new Error(`Error saat mengambil detail proshare: ${error.message}`);
  }
};

const generateProsharePdf = async (proshareId) => {
  try {
    const proshareDetails = await getProshareDetails(proshareId);

    // Format tanggal Indonesia
    const formatDate = (dateString) => {
      const options = { day: "numeric", month: "long", year: "numeric" };
      return new Date(dateString).toLocaleDateString("id-ID", options);
    };

    // Hitung persentase proshare jika ada data invoice
    const invoiceTotal = proshareDetails.invoice?.price || 0;
    const prosharePercentage = 10

    // Pastikan direktori temp ada
    const tempDir = path.join(__dirname, '../../temp');
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, `proshare-${proshareId}.pdf`);
    
    // Buat PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `Proshare Slip #${proshareId}`,
        Author: 'Bimbingan Belajar Galaksi',
        Subject: 'Slip Proshare Mitra',
        Creator: 'Proshare System'
      }
    });

    // Pipe ke file
    doc.pipe(require('fs').createWriteStream(filePath));

    // Colors
    const primaryColor = '#2c3e50';
    const accentColor = '#3498db';
    const successColor = '#27ae60';
    const dangerColor = '#e74c3c';
    const lightBlue = '#e3f2fd';
    const lightGray = '#f8f9fa';
    const darkGray = '#7f8c8d';
    const warningColor = '#f39c12';

    // Header dengan background
    doc.rect(0, 0, doc.page.width, 140).fill(lightGray);
    
    // Company info
    doc.fillColor(primaryColor)
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('BIMBINGAN BELAJAR GALAKSI', 50, 30);
    
    doc.fillColor(accentColor)
       .fontSize(12)
       .font('Helvetica-Oblique')
       .text('Sahabat untuk Meraih Prestasi', 50, 60);
    
    doc.fillColor(darkGray)
       .fontSize(10)
       .font('Helvetica')
       .text('Tembalang Pesona Asri Blok A No. 24 Semarang', 50, 80)
       .text('HP: 0852-9236-5257', 50, 95);

    // Document title
    doc.fillColor(warningColor)
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('SLIP PROSHARE MITRA', 50, 115);

    // Proshare info di kanan atas
    const proshareDate = formatDate(proshareDetails.updatedAt);
    const statusColor = proshareDetails.paymentStatus === 'Paid' ? successColor : dangerColor;
    
    doc.fillColor(primaryColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(`Proshare ID: #${proshareId}`, 400, 30)
       .fontSize(10)
       .font('Helvetica')
       .text(`Tanggal: ${proshareDate}`, 400, 60);
    
    doc.fillColor(statusColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(`Status: ${proshareDetails.paymentStatus}`, 400, 75);

    // Garis pemisah
    doc.moveTo(50, 160)
       .lineTo(550, 160)
       .strokeColor(accentColor)
       .lineWidth(2)
       .stroke();

    // Info boxes section
    let currentY = 190;
    
    // Box 1: Informasi Mitra
    doc.rect(50, currentY, 240, 120)
       .fill(lightGray)
       .stroke('#ddd');
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMASI MITRA', 60, currentY + 10);
    
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text(`Nama: ${proshareDetails.mitra?.name || 'N/A'}`, 60, currentY + 30)
       .text(`ID Mitra: ${proshareDetails.mitra?.id || 'N/A'}`, 60, currentY + 45)
       .text(`Email: ${proshareDetails.mitra?.email || 'N/A'}`, 60, currentY + 60)
       .text(`Phone: ${proshareDetails.mitra?.phone || 'N/A'}`, 60, currentY + 75)
       .text(`Bank: ${proshareDetails.mitra?.bankName || 'Belum diatur'}`, 60, currentY + 90);

    // Box 2: Informasi Siswa & Paket
    doc.rect(310, currentY, 240, 120)
       .fill(lightGray)
       .stroke('#ddd');
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMASI SISWA & PAKET', 320, currentY + 10);
    
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text(`Siswa: ${proshareDetails.siswa?.name || 'N/A'}`, 320, currentY + 30)
       .text(`Level: ${proshareDetails.siswa?.level || 'N/A'}`, 320, currentY + 45)
       .text(`Paket: ${proshareDetails.paket?.name || 'N/A'}`, 320, currentY + 60)
       .text(`Harga Paket: Rp ${(proshareDetails.paket?.price || 0).toLocaleString('id-ID')}`, 320, currentY + 75)
       .text(`Persentase: ${prosharePercentage}%`, 320, currentY + 90);

    // Detail Invoice Section
    currentY += 150;
    doc.rect(50, currentY, 500, 80)
       .fill('#fff3cd')
       .stroke(warningColor);
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('DETAIL TRANSAKSI', 70, currentY + 10);
    
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text(`Invoice ID: #${proshareDetails.invoice?.id || 'N/A'}`, 70, currentY + 30)
       .text(`Tanggal Invoice: ${proshareDetails.invoice?.createdAt ? formatDate(proshareDetails.invoice.createdAt) : 'N/A'}`, 70, currentY + 45)
       .text(`Total Invoice: Rp ${(proshareDetails.paket?.price || 0).toLocaleString('id-ID')}`, 320, currentY + 30)
       .text(`Status Invoice: ${proshareDetails.invoice?.paymentStatus || 'N/A'}`, 320, currentY + 45);

    // Summary pembayaran
    currentY += 110;
    doc.rect(50, currentY, 500, 140)
       .fill(lightBlue)
       .stroke(accentColor);
    
    doc.fillColor(primaryColor)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('RINGKASAN PROSHARE', 70, currentY + 15);

    // Summary items
    const summaryItems = [
      { label: 'Total Invoice', value: `Rp ${(proshareDetails.paket?.price || 0).toLocaleString('id-ID')}` },
      { label: 'Persentase Proshare', value: `${prosharePercentage}%` },
      { label: 'Jumlah Proshare', value: `Rp ${proshareDetails.total.toLocaleString('id-ID')}` }
    ];

    let summaryY = currentY + 45;
    summaryItems.forEach(item => {
      doc.fillColor('#1565c0')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(item.label, 70, summaryY);
      
      doc.fillColor('#0d47a1')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(item.value, 400, summaryY);
      
      // Garis putus-putus
      doc.moveTo(70, summaryY + 12)
         .lineTo(480, summaryY + 12)
         .dash(3, { space: 3 })
         .strokeColor('#bbdefb')
         .stroke()
         .undash();
      
      summaryY += 25;
    });

    // Total final
    doc.rect(70, summaryY + 5, 410, 30)
       .fill(warningColor)
       .stroke('#d68910');
    
    doc.fillColor('white')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('TOTAL PROSHARE DITERIMA', 80, summaryY + 13)
       .text(`Rp ${proshareDetails.total.toLocaleString('id-ID')}`, 400, summaryY + 13);

    // Bank info jika ada
    if (proshareDetails.mitra?.bankName && proshareDetails.mitra?.bankNumber) {
      currentY += 180;
      doc.rect(50, currentY, 500, 80)
         .fill(lightGray)
         .stroke('#ddd');
      
      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('INFORMASI TRANSFER', 70, currentY + 15);
      
      doc.fillColor('#333')
         .fontSize(10)
         .font('Helvetica')
         .text(`Proshare akan ditransfer ke rekening ${proshareDetails.mitra.bankName}`, 70, currentY + 35)
         .text(`Nomor Rekening: ${proshareDetails.mitra.bankNumber}`, 70, currentY + 50)
         .text(`Atas Nama: ${proshareDetails.mitra.name}`, 70, currentY + 65);
    }

    // Catatan khusus
    const noteY = currentY + (proshareDetails.mitra?.bankName ? 100 : 20);
    doc.rect(50, noteY, 500, 60)
       .fill('#ffeaa7')
       .stroke('#fdcb6e');
    
    doc.fillColor('#2d3436')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('CATATAN PENTING:', 70, noteY + 15);
    
    doc.fillColor('#2d3436')
       .fontSize(9)
       .font('Helvetica')
       .text('• Proshare dihitung berdasarkan persentase dari total nilai paket yang dibeli', 70, noteY + 30)
       .text('• Pembayaran proshare akan dilakukan sesuai dengan kebijakan perusahaan', 70, noteY + 43);

    // Footer
    doc.fillColor(darkGray)
       .fontSize(8)
       .font('Helvetica')
       .text('Dokumen ini dibuat secara otomatis oleh sistem Bimbingan Belajar Galaksi', 50, doc.page.height - 50, {
         align: 'center',
         width: 500
       });

    // Signature section
    const signatureY = doc.page.height - 120;
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text('Mengetahui,', 80, signatureY)
       .text('Mitra,', 420, signatureY);

    // Signature lines
    doc.moveTo(80, signatureY + 60)
       .lineTo(180, signatureY + 60)
       .strokeColor('#333')
       .lineWidth(1)
       .stroke();
    
    doc.moveTo(420, signatureY + 60)
       .lineTo(520, signatureY + 60)
       .strokeColor('#333')
       .lineWidth(1)
       .stroke();

    doc.fillColor('#333')
       .fontSize(9)
       .font('Helvetica')
       .text('(Admin)', 110, signatureY + 70)
       .text(`(${proshareDetails.mitra?.name || 'Mitra'})`, 440, signatureY + 70);

    // Finalize PDF
    doc.end();

    // Tunggu sampai file selesai dibuat
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(filePath);
      });
      doc.on('error', reject);
    });

  } catch (error) {
    throw new Error(`Error saat membuat PDF proshare: ${error.message}`);
  }
};

module.exports = {
  processProsharePayment,
  getAllProshares,
  getProshareDetails,
  generateProsharePdf
};