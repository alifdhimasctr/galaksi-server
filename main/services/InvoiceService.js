//services/invoiceService.js
const db = require("../../database/db");
const { get } = require("../controllers/AuthController");
const { Invoice, Siswa, Mitra, Paket } = require("../models");
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs').promises;

const createInvoice = async (
  { orderId, subscriptionId, paketId },
  options = {}
) => {
  try {
    const paket = await Paket.findOne({ where: { id: paketId } });
    if (!paket) {
      throw new Error("Paket tidak ditemukan");
    }
    const invoice = await Invoice.create(
      {
        orderId,
        subscriptionId,
        paketId,
        price: paket.price,
      },
      options
    );
    return invoice;
  } catch (error) {
    throw new Error(`Error saat membuat invoice: ${error.message}`);
  }
};

const getAllInvoices = async (filters = {}) => {
  try {
    const whereClause = {};
    if (filters.status) {
      whereClause.paymentStatus = filters.status;
    }
    if (filters.siswaId) {
      whereClause.siswaId = filters.siswaId;
    }

    const invoices = await Invoice.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']],
    });

    if (!invoices || invoices.length === 0) {
      return [];
    }

    const siswaIds = invoices.map((invoice) => invoice.siswaId);
    const siswaList = await Siswa.findAll({
      where: { id: siswaIds },
    });

    const mitraIds = [...new Set(siswaList.map((siswa) => siswa.mitraId))];
    const mitraList = await Mitra.findAll({
      where: { id: mitraIds },
    });

    const paketIds = invoices.map((invoice) => invoice.paketId);
    const paketList = await Paket.findAll({
      where: { id: paketIds },
    });

    const invoicesWithDetails = invoices.map((invoice) => {
      const siswa = siswaList.find((siswa) => siswa.id === invoice.siswaId);
      const mitra = siswa
        ? mitraList.find((mitra) => mitra.id === siswa.mitraId)
        : null;
      const paket = paketList.find((paket) => paket.id === invoice.paketId);

      return {
        ...invoice.toJSON(),
        siswa: siswa
          ? {
              id: siswa.id,
              name: siswa.name,
              level: siswa.level,
              mitraId: siswa.mitraId,
            }
          : null,
        mitra: mitra ? { id: mitra.id, name: mitra.name } : null,
        paket: paket ? { id: paket.id, name: paket.name } : null,
      };
    });

    return invoicesWithDetails;
  } catch (error) {
    throw new Error(`Error saat mengambil semua invoice: ${error.message}`);
  }
};

const processInvocePayment = async (invoiceId, transferProof) => {
  const t = await db.transaction();

  try {
    const invoice = await Invoice.findByPk(invoiceId, {
      lock: true,
      transaction: t,
    });
    if (!invoice) throw new Error("Invoice tidak ditemukan");

    const siswa = await Siswa.findByPk(invoice.siswaId, { transaction: t });
    if (!siswa) throw new Error("Siswa tidak ditemukan");

    if (siswa.isFirstPurchase) {
      siswa.isFirstPurchase = false;
      await siswa.save({ transaction: t });
    }

    invoice.paymentStatus = "Paid";
    invoice.transferProof = transferProof;
    invoice.paymentDate = new Date();
    await invoice.save({ transaction: t });

    await t.commit();
    return invoice;
  } catch (error) {
    await t.rollback();
    throw new Error(`Pembayaran Invoice gagal: ${error.message}`);
  }
};

const getInvoiceDetails = async (invoiceId) => {
  try {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) throw new Error("Invoice tidak ditemukan");

    const siswa = await Siswa.findByPk(invoice.siswaId);
    const mitra = siswa ? await Mitra.findByPk(siswa.mitraId) : null;
    const paket = await Paket.findByPk(invoice.paketId);

    return {
      ...invoice.toJSON(),
      siswa: siswa ? { id: siswa.id, name: siswa.name } : null,
      mitra: mitra ? { id: mitra.id, name: mitra.name } : null,
      paket: paket ? { id: paket.id, name: paket.name } : null,
    };
  } catch (error) {
    throw new Error(`Error saat mengambil detail invoice: ${error.message}`);
  }
};

const generateInvoicePdf = async (invoiceId) => {
  try {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) throw new Error("Invoice tidak ditemukan");

    const siswa = await Siswa.findByPk(invoice.siswaId);
    if (!siswa) throw new Error("Siswa tidak ditemukan");

    const paket = await Paket.findByPk(invoice.paketId);
    if (!paket) throw new Error("Paket tidak ditemukan");

    // Pastikan direktori temp ada
    const tempDir = path.join(__dirname, '../../temp');
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, `invoice-${invoiceId}.pdf`);
    
    // Buat PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `Invoice #${invoice.id}`,
        Author: 'Bimbingan Belajar Galaksi',
        Subject: 'Invoice Pembayaran',
        Creator: 'Invoice System'
      }
    });

    // Pipe ke file
    doc.pipe(require('fs').createWriteStream(filePath));

    // Colors
    const primaryColor = '#2c3e50';
    const accentColor = '#3498db';
    const lightGray = '#ecf0f1';
    const darkGray = '#7f8c8d';

    // Header dengan background
    doc.rect(0, 0, doc.page.width, 120).fill('#f8f9fa');
    
    // Logo placeholder dan company info
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

    // Invoice info di kanan atas
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('id-ID');
    doc.fillColor(primaryColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(`INVOICE #${invoice.id}`, 400, 30)
       .fontSize(10)
       .font('Helvetica')
       .text(`Tanggal: ${invoiceDate}`, 400, 60)
       .text(`Status: ${invoice.paymentStatus}`, 400, 75);

    // Garis pemisah
    doc.moveTo(50, 140)
       .lineTo(550, 140)
       .strokeColor(accentColor)
       .lineWidth(2)
       .stroke();

    // Detail Penerima
    let currentY = 170;
    doc.fillColor(primaryColor)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('KEPADA YTH:', 50, currentY);
    
    currentY += 25;
    doc.fillColor('#333')
       .fontSize(11)
       .font('Helvetica')
       .text(`Nama: ${siswa.name}`, 50, currentY)
       .text(`Orang Tua: ${siswa.parentName || '-'}`, 50, currentY + 15)
       .text(`Alamat: ${siswa.address || '-'}`, 50, currentY + 30);

    // Tabel Invoice
    currentY += 80;
    const tableTop = currentY;
    const tableLeft = 50;
    const tableWidth = 500;

    // Header tabel
    doc.rect(tableLeft, tableTop, tableWidth, 35)
       .fill(accentColor);
    
    doc.fillColor('white')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('No', tableLeft + 15, tableTop + 12)
       .text('Deskripsi', tableLeft + 60, tableTop + 12)
       .text('Jumlah', tableLeft + 300, tableTop + 12)
       .text('Harga', tableLeft + 420, tableTop + 12);

    // Isi tabel
    let rowY = tableTop + 35;
    let rowNumber = 1;

    // Row paket
    doc.rect(tableLeft, rowY, tableWidth, 30)
       .fill(rowNumber % 2 === 0 ? lightGray : 'white')
       .stroke('#ddd');
    
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text(rowNumber.toString(), tableLeft + 15, rowY + 10)
       .text(paket.name, tableLeft + 60, rowY + 10)
       .text('1', tableLeft + 320, rowY + 10)
       .text(`Rp ${paket.price.toLocaleString('id-ID')}`, tableLeft + 420, rowY + 10);

    rowY += 30;
    rowNumber++;

    // Biaya pendaftaran jika pembelian pertama
    const registrationFee = siswa.isFirstPurchase ? 95000 : 0;
    if (registrationFee > 0) {
      doc.rect(tableLeft, rowY, tableWidth, 30)
         .fill(rowNumber % 2 === 0 ? lightGray : 'white')
         .stroke('#ddd');
      
      doc.fillColor('#333')
         .fontSize(10)
         .font('Helvetica')
         .text(rowNumber.toString(), tableLeft + 15, rowY + 10)
         .text('Biaya Pendaftaran', tableLeft + 60, rowY + 10)
         .text('1', tableLeft + 320, rowY + 10)
         .text(`Rp ${registrationFee.toLocaleString('id-ID')}`, tableLeft + 420, rowY + 10);
      
      rowY += 30;
    }

    // Total
    const total = paket.price + registrationFee;
    doc.rect(tableLeft, rowY, tableWidth, 35)
       .fill('#e3f2fd')
       .stroke(accentColor);
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL', tableLeft + 60, rowY + 12)
       .text(`Rp ${total.toLocaleString('id-ID')}`, tableLeft + 420, rowY + 12);

    // Informasi Pembayaran
    currentY = rowY + 80;
    doc.rect(50, currentY, 500, 120)
       .fill('#f8f9fa')
       .stroke('#ddd');
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMASI PEMBAYARAN', 70, currentY + 15);
    
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text('Silakan transfer ke salah satu rekening berikut:', 70, currentY + 35)
       .text('• Mandiri: 1360005517518', 70, currentY + 50)
       .text('• BCA: 8030101309', 280, currentY + 50)
       .text('• BRI: 152901004279509', 70, currentY + 65)
       .text('• BNI: 0905008548', 280, currentY + 65)
       .text('• Bank Jateng: 2055067697', 70, currentY + 80)
       .font('Helvetica-Bold')
       .text('a.n. Edi Susanto', 70, currentY + 95);

    // Footer
    doc.fillColor(darkGray)
       .fontSize(8)
       .font('Helvetica')
       .text('Terima kasih atas kepercayaan Anda kepada Bimbingan Belajar Galaksi', 50, doc.page.height - 50, {
         align: 'center',
         width: 500
       });

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
    throw new Error(`Error saat membuat PDF: ${error.message}`);
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  processInvocePayment,
  getInvoiceDetails,
  generateInvoicePdf,
};