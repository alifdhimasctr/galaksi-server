// services/HonorService.js
const { Honor, Tentor, Order, Proshare, Jadwal, Siswa } = require("../models");
const db = require("../../database/db");
const PDFDocument = require('pdfkit');
const path = require("path");
const fs = require("fs").promises;

const processHonorPayment = async (honorId, transferProof) => {
  const t = await db.transaction();

  try {
    const honor = await Honor.findByPk(honorId, { transaction: t });
    if (!honor) throw new Error("Honor tidak ditemukan");

    const amount = honor.total;

    honor.paymentStatus = "Paid";
    honor.paymentDate = new Date();
    honor.transferProof = transferProof;
    await honor.save({ transaction: t });

    const tentor = await Tentor.findByPk(honor.tentorId, { transaction: t });
    if (!tentor) throw new Error("Tentor tidak ditemukan");
    tentor.wallet -= amount;
    await tentor.save({ transaction: t });

    await t.commit();
    return honor;
  } catch (error) {
    await t.rollback();
    throw new Error(`Pembayaran Honor gagal: ${error.message}`);
  }
};

const getAllHonor = async (filters = {}) => {
  try {
    const whereClause = {};
    if (filters.tentorId) {
      whereClause.tentorId = filters.tentorId;
    }
    
    const honors = await Honor.findAll({
      where: whereClause,
      order: [["updatedAt", "DESC"]],
    });
    
    const honorsWithDetails = await Promise.all(
      honors.map(async (honor) => {
        const tentor = await Tentor.findByPk(honor.tentorId);
        const siswa = await Siswa.findByPk(honor.siswaId);
        const jadwals = await Jadwal.findAll({
          where: {
            invoiceId: honor.invoiceId,
            tentorId: honor.tentorId,
          },
        });

        return {
          ...honor.toJSON(),
          siswa: siswa ? { id: siswa.id, name: siswa.name, level: siswa.level } : null,
          tentor: tentor
            ? {
                id: tentor.id,
                name: tentor.name,
                bankName: tentor.bankName,
                bankNumber: tentor.bankNumber,
              }
            : null,
          jadwals: jadwals.map((jadwal) => ({
            id: jadwal.id,
            dayName: jadwal.dayName,
            date: jadwal.date,
            time: jadwal.time,
          })),
        };
      })
    );
    
    return honorsWithDetails;
  } catch (error) {
    throw new Error(`Error saat mengambil semua honor: ${error.message}`);
  }
};

const getHonorDetails = async (honorId) => {
  try {
    const honor = await Honor.findByPk(honorId);
    if (!honor) throw new Error("Honor tidak ditemukan");
    
    const tentor = await Tentor.findByPk(honor.tentorId);
    const siswa = await Siswa.findByPk(honor.siswaId);
    const jadwals = await Jadwal.findAll({
      where: {
        invoiceId: honor.invoiceId,
        tentorId: honor.tentorId,
      },
    });

    return {
      ...honor.toJSON(),
      siswa: siswa ? { id: siswa.id, name: siswa.name, level: siswa.level } : null,
      tentor: tentor
        ? {
            id: tentor.id,
            name: tentor.name,
            bankName: tentor.bankName,
            bankNumber: tentor.bankNumber,
          }
        : null,
      jadwals: jadwals.map((jadwal) => ({
        id: jadwal.id,
        dayName: jadwal.dayName,
        date: jadwal.date,
        time: jadwal.time,
      })),
    };
  } catch (error) {
    throw new Error(`Error saat mengambil detail honor: ${error.message}`);
  }
};

const generateHonorPdf = async (honorId) => {
  try {
    // Ambil data honor lengkap
    const honorDetails = await getHonorDetails(honorId);

    // Format tanggal Indonesia
    const formatDate = (dateString) => {
      const options = { day: "numeric", month: "long", year: "numeric" };
      return new Date(dateString).toLocaleDateString("id-ID", options);
    };

    // Pastikan nilai default untuk mencegah error
    honorDetails.amount = honorDetails.amount || 0;
    honorDetails.proshareAmount = honorDetails.proshareAmount || 0;
    honorDetails.total = honorDetails.total || 0;
    honorDetails.prosharePercentage = honorDetails.prosharePercentage || 0;

    // Hitung jumlah sesi
    const sessionCount = honorDetails.jadwals.length;
    const honorPerSession = sessionCount > 0 ? honorDetails.total / sessionCount : 0;

    // Pastikan direktori temp ada
    const tempDir = path.join(__dirname, '../../temp');
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, `honor-${honorId}.pdf`);
    
    // Buat PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `Honor Slip #${honorId}`,
        Author: 'Bimbingan Belajar Galaksi',
        Subject: 'Slip Honor Tentor',
        Creator: 'Honor System'
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

    // Header dengan background
    doc.rect(0, 0, doc.page.width, 140).fill(lightGray);
    
    // Company info
    doc.fillColor(primaryColor)
       .fontSize(24)
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
    doc.fillColor(accentColor)
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('SLIP HONOR TENTOR', 50, 115);

    // Honor info di kanan atas
    const honorDate = formatDate(honorDetails.updatedAt);
    const statusColor = honorDetails.paymentStatus === 'Paid' ? successColor : dangerColor;
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`Honor ID: #${honorId}`, 400, 30)
       .fontSize(10)
       .font('Helvetica')
       .text(`Tanggal: ${honorDate}`, 400, 50);
    
    doc.fillColor(statusColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(`Status: ${honorDetails.paymentStatus}`, 400, 65);

    // Garis pemisah
    doc.moveTo(50, 160)
       .lineTo(550, 160)
       .strokeColor(accentColor)
       .lineWidth(2)
       .stroke();

    // Info boxes
    let currentY = 190;
    
    // Box 1: Informasi Tentor
    doc.rect(50, currentY, 240, 100)
       .fill(lightGray)
       .stroke('#ddd');
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMASI TENTOR', 60, currentY + 10);
    
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text(`Nama: ${honorDetails.tentor?.name || 'N/A'}`, 60, currentY + 30)
       .text(`ID Tentor: ${honorDetails.tentor?.id || 'N/A'}`, 60, currentY + 45)
       .text(`Bank: ${honorDetails.tentor?.bankName || 'Belum diatur'}`, 60, currentY + 60)
       .text(`Rekening: ${honorDetails.tentor?.bankNumber || 'Belum diatur'}`, 60, currentY + 75);

    // Box 2: Informasi Siswa
    doc.rect(310, currentY, 240, 100)
       .fill(lightGray)
       .stroke('#ddd');
    
    doc.fillColor(primaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMASI SISWA', 320, currentY + 10);
    
    doc.fillColor('#333')
       .fontSize(10)
       .font('Helvetica')
       .text(`Nama: ${honorDetails.siswa?.name || 'N/A'}`, 320, currentY + 30)
       .text(`Level: ${honorDetails.siswa?.level || 'N/A'}`, 320, currentY + 45)
       .text(`Jumlah Sesi: ${sessionCount} sesi`, 320, currentY + 60)
       .text(`Honor/Sesi: Rp ${honorPerSession.toLocaleString('id-ID')}`, 320, currentY + 75);

    // Tabel Jadwal
    currentY += 130;
    doc.fillColor(primaryColor)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('JADWAL MENGAJAR', 50, currentY);

    currentY += 25;
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
       .text('Hari/Tanggal', tableLeft + 60, tableTop + 12)
       .text('Waktu', tableLeft + 220, tableTop + 12)
       .text('Siswa', tableLeft + 320, tableTop + 12);

    // Isi tabel
    let rowY = tableTop + 35;
    honorDetails.jadwals.forEach((jadwal, index) => {
      const rowHeight = 30;
      
      doc.rect(tableLeft, rowY, tableWidth, rowHeight)
         .fill(index % 2 === 0 ? 'white' : lightGray)
         .stroke('#ddd');
      
      doc.fillColor('#333')
         .fontSize(10)
         .font('Helvetica')
         .text((index + 1).toString(), tableLeft + 15, rowY + 10)
         .text(`${jadwal.dayName}`, tableLeft + 60, rowY + 5)
         .text(`${formatDate(jadwal.date)}`, tableLeft + 60, rowY + 18)
         .text(jadwal.time, tableLeft + 220, rowY + 10)
         .text(honorDetails.siswa?.name || 'N/A', tableLeft + 320, rowY + 10);
      
      rowY += rowHeight;
    });

    // Summary pembayaran
    currentY = rowY + 30;
    doc.rect(50, currentY, 500, 120)
       .fill(lightBlue)
       .stroke(accentColor);
    
    doc.fillColor(primaryColor)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('RINGKASAN PEMBAYARAN', 70, currentY + 15);

    // Summary rows
    const summaryItems = [
      { label: 'Jumlah Sesi Mengajar', value: `${sessionCount} sesi` },
      { label: 'Honor Per Sesi', value: `Rp ${honorPerSession.toLocaleString('id-ID')}` },
      { label: 'Total Honor Kotor', value: `Rp ${honorDetails.total.toLocaleString('id-ID')}` }
    ];

    let summaryY = currentY + 40;
    summaryItems.forEach(item => {
      doc.fillColor('#1565c0')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(item.label, 70, summaryY);
      
      doc.fillColor('#0d47a1')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(item.value, 400, summaryY);
      
      // Garis putus-putus
      doc.moveTo(70, summaryY + 12)
         .lineTo(480, summaryY + 12)
         .dash(3, { space: 3 })
         .strokeColor('#bbdefb')
         .stroke()
         .undash();
      
      summaryY += 20;
    });

    // Total final
    doc.rect(70, summaryY, 410, 25)
       .fill('#1976d2')
       .stroke('#1565c0');
    
    doc.fillColor('white')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL YANG DITERIMA', 80, summaryY + 8)
       .text(`Rp ${honorDetails.total.toLocaleString('id-ID')}`, 400, summaryY + 8);

    // Bank info jika ada
    if (honorDetails.tentor?.bankName && honorDetails.tentor?.bankNumber) {
      currentY += 160;
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
         .text(`Honor akan ditransfer ke rekening ${honorDetails.tentor.bankName}`, 70, currentY + 35)
         .text(`Nomor Rekening: ${honorDetails.tentor.bankNumber}`, 70, currentY + 50)
         .text(`Atas Nama: ${honorDetails.tentor.name}`, 70, currentY + 65);
    }

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
       .text('Tentor,', 420, signatureY);

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
       .text(`(${honorDetails.tentor?.name || 'Tentor'})`, 440, signatureY + 70);

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
    throw new Error(`Error saat membuat PDF honor: ${error.message}`);
  }
};

module.exports = {
  processHonorPayment,
  getAllHonor,
  getHonorDetails,
  generateHonorPdf,
};