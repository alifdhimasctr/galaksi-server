// services/ProshareService.js
const { Proshare, Mitra, Invoice, Siswa, Paket } = require('../models');
const db = require("../../database/db");
const puppeteer = require("puppeteer");
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

    amount = proshare.total;

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
  )

  return proshareDetails;
}


const getProshareDetails = async (proshareId) => {
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
};

const generateProsharePdf = async (proshareId) => {
  try {
    const proshareDetails = await getProshareDetails(proshareId);

    // Format tanggal Indonesia
    const formatDate = (dateString) => {
      const options = { day: "numeric", month: "long", year: "numeric" };
      return new Date(dateString).toLocaleDateString("id-ID", options);
    };

    // Buat template HTML
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
          <div class="document-title">SLIP PROSHARE MITRA</div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <div class="info-title">Informasi Mitra</div>
            <div><strong>Nama:</strong> ${proshareDetails.mitra.name}</div>
            <div><strong>ID Mitra:</strong> ${proshareDetails.mitra.id}</div>
          </div>
          
          <div class="info-box">
            <div class="info-title">Informasi Proshare</div>
            <div><strong>Tanggal Pembayaran:</strong></div>
            <div> ${formatDate(proshareDetails.updatedAt)}</div>
            <div><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold">${proshareDetails.paymentStatus}</span></div>
          </div>
        </div>
        
        <div class="info-box">
          <div class="info-title">Informasi Paket</div>
          <div><strong>Nama Paket:</strong> ${proshareDetails.paket?.name || '-'}</div>
          <div><strong>Harga Paket:</strong> Rp ${proshareDetails.paket?.price?.toLocaleString('id-ID') || '0'}</div>
        </div>
        
        <div class="payment-summary">
          <div class="summary-row">
            <div class="summary-label">Proshare</div>
            <div class="summary-value">Rp ${proshareDetails.total.toLocaleString('id-ID')}</div>
          </div>
          
          <div class="summary-row total-row">
            <div class="summary-label">TOTAL DITERIMA</div>
            <div class="summary-value">Rp ${proshareDetails.total.toLocaleString('id-ID')}</div>
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

    const filePath = path.join(__dirname, "../../temp", `proshare-${proshareId}.pdf`);

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
    throw new Error(`Error saat membuat PDF proshare: ${error.message}`);
  }
};



module.exports = {
    processProsharePayment,
    getAllProshares,
    getProshareDetails,
    generateProsharePdf
};
