// services/HonorService.js
const { Honor, Tentor, Order, Proshare, Jadwal, Siswa } = require("../models");
const db = require("../../database/db");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs").promises;

const processHonorPayment = async (honorId, transferProof) => {
  const t = await db.transaction();

  try {
    const honor = await Honor.findByPk(honorId, { transaction: t });
    if (!honor) throw new Error("Honor tidak ditemukan");

    amount = honor.total;

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

const getAllHonor = async (fliters = {}) => {
  try {
    const whereClause = {};
    if (fliters.tentorId) {
      whereClause.tentorId = fliters.tentorId;
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
          siswa: siswa ? { id: siswa.id, name: siswa.name } : null,
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
    siswa: siswa ? { id: siswa.id, name: siswa.name } : null,
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

    honorDetails.amount = honorDetails.amount || 0;
    honorDetails.proshareAmount = honorDetails.proshareAmount || 0;
    honorDetails.total = honorDetails.total || 0;
    honorDetails.prosharePercentage = honorDetails.prosharePercentage || 0;

    // Hitung jumlah sesi
    const sessionCount = honorDetails.jadwals.length;

    // Buat template HTML dengan CSS modern
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* Modern Invoice Styling */
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #333;
          background-color: #f9fbfd;
        }
        .invoice-container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 30px;
          background-color: white;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #3498db;
          padding-bottom: 20px;
        }
        .company-name { 
          font-size: 24px; 
          font-weight: bold; 
          color: #2c3e50;
          letter-spacing: 1px;
        }
        .document-title {
          font-size: 28px;
          font-weight: bold;
          color: #3498db;
          margin: 20px 0;
          text-transform: uppercase;
        }
        .tagline { 
          font-size: 14px; 
          color: #7f8c8d; 
          margin: 5px 0; 
        }
        .contact-info { 
          font-size: 12px; 
          color: #95a5a6; 
        }
        
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-box {
          flex: 1;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
          margin: 0 10px;
        }
        .info-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #2c3e50;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 5px;
        }
        
        .jadwal-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 30px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
        }
        .jadwal-table th { 
          background-color: #3498db; 
          color: white; 
          text-align: left;
          padding: 12px 15px;
        }
        .jadwal-table td { 
          padding: 10px 15px;
          border-bottom: 1px solid #ecf0f1;
        }
        .jadwal-table tr:nth-child(even) { 
          background-color: #f8f9fa; 
        }
        
        .payment-summary {
          background-color: #e3f2fd;
          padding: 20px;
          border-radius: 5px;
          margin-top: 20px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #bbdefb;
        }
        .summary-row:last-child {
          border-bottom: none;
        }
        .summary-label {
          font-weight: 600;
          color: #1565c0;
        }
        .summary-value {
          font-weight: bold;
          color: #0d47a1;
        }
        .total-row {
          font-size: 18px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #bbdefb;
        }
        
        .bank-info { 
          background-color: #f8f9fa; 
          padding: 20px;
          border-radius: 5px;
          margin-top: 30px;
          border-left: 4px solid #3498db;
        }
        .bank-info-title { 
          font-weight: bold; 
          margin-bottom: 10px;
          color: #2c3e50;
          font-size: 16px;
        }
        
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #95a5a6;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        .signature-section {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          text-align: center;
          width: 45%;
        }
        .signature-line {
          margin: 60px 0 10px 0;
          border-bottom: 1px solid #333;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-name">BIMBINGAN BELAJAR GALAKSI</div>
          <div class="tagline">Sahabat untuk Meraih Prestasi</div>
          <div class="contact-info">Tembalang Pesona Asri Blok A No. 24 Semarang | HP 0852-9236-5257</div>
          <div class="document-title">SLIP HONOR TENTOR</div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <div class="info-title">Informasi Tentor</div>
            <div><strong>Nama:</strong> ${honorDetails.tentor.name}</div>
            <div><strong>ID Tentor:</strong> ${honorDetails.tentor.id}</div>
            <div><strong>Rekening:</strong> ${
              honorDetails.tentor.bankAccount || "Belum diatur"
            }</div>
          </div>
          
          <div class="info-box">
            <div class="info-title">Informasi Honor</div>
            <div><strong>Tanggal Pembayaran:</strong></div>
            <div> ${formatDate(honorDetails.updatedAt)}</div>
            <div><strong>Status:</strong> <span style="color: ${
              honorDetails.paymentStatus === "Paid" ? "#27ae60" : "#e74c3c"
            }; font-weight: bold">${honorDetails.paymentStatus}</span></div>
          </div>
        </div>
        
        <div class="info-title">Jadwal Mengajar</div>
        <table class="jadwal-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Hari/Tanggal</th>
              <th>Waktu</th>
              <th>Siswa</th>
            </tr>
          </thead>
          <tbody>
            ${honorDetails.jadwals
              .map(
                (jadwal, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${jadwal.dayName}, ${formatDate(jadwal.date)}</td>
                <td>${jadwal.time}</td>
                <td>${honorDetails.siswa.name}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <div class="payment-summary">
          <div class="summary-row">
            <div class="summary-label">Jumlah Sesi</div>
            <div class="summary-value">${sessionCount} sesi</div>
          </div>
          <div class="summary-row">
            <div class="summary-label">Honor Per Sesi</div>
            <div class="summary-value">Rp ${(
              honorDetails.total / sessionCount
            ).toLocaleString("id-ID")}</div>
          </div>
          <div class="summary-row">
            <div class="summary-label">Total Honor</div>
            <div class="summary-value">Rp ${honorDetails.total.toLocaleString(
              "id-ID"
            )}</div>
          </div>
  
          <div class="summary-row total-row">
            <div class="summary-label">TOTAL DITERIMA</div>
            <div class="summary-value">Rp ${honorDetails.total.toLocaleString(
              "id-ID"
            )}</div>
          </div>
        </div>

      </div>
    </body>
    </html>
    `;

    // Generate PDF menggunakan Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate);

    const filePath = path.join(__dirname, "../../temp", `honor-${honorId}.pdf`);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    await browser.close();

    return filePath;
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
