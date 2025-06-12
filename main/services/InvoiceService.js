//services/invoiceService.js
const db = require("../../database/db");
const { get } = require("../controllers/AuthController");
const { Invoice, Siswa, Mitra, Paket } = require("../models");
const puppeteer = require('puppeteer');
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
      whereClause.paymentStatus = filters.status; // Filter berdasarkan status pembayaran
    }
    if (filters.siswaId) {
      whereClause.siswaId = filters.siswaId; // Filter berdasarkan siswaId
    }

    // Ambil semua invoice sesuai filter
    const invoices = await Invoice.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']],
    });
    


    if (!invoices || invoices.length === 0) {
      return []; // Tidak ada invoice ditemukan
    }

    // Ambil semua siswa berdasarkan siswaId yang ada di invoice
    const siswaIds = invoices.map((invoice) => invoice.siswaId);
    const siswaList = await Siswa.findAll({
      where: {
        id: siswaIds,
      },
    });

    // Ambil semua mitra berdasarkan mitraId yang ada pada siswa
    const mitraIds = [...new Set(siswaList.map((siswa) => siswa.mitraId))]; // Dapatkan ID mitra unik
    const mitraList = await Mitra.findAll({
      where: {
        id: mitraIds,
      },
    });

    // Ambil semua paket berdasarkan paketId yang ada di invoice
    const paketIds = invoices.map((invoice) => invoice.paketId);
    const paketList = await Paket.findAll({
      where: {
        id: paketIds,
      },
    });

    // Gabungkan data invoice dengan siswa, mitra, dan paket
    const invoicesWithDetails = invoices.map((invoice) => {
      // Cari siswa yang sesuai
      const siswa = siswaList.find((siswa) => siswa.id === invoice.siswaId);

      // Cari mitra yang sesuai berdasarkan siswa.mitraId
      const mitra = siswa
        ? mitraList.find((mitra) => mitra.id === siswa.mitraId)
        : null;

      // Cari paket yang sesuai berdasarkan invoice.paketId
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

    // Ambil data siswa
    const siswa = await Siswa.findByPk(invoice.siswaId, { transaction: t });
    if (!siswa) throw new Error("Siswa tidak ditemukan");

    // Jika pembelian pertama, update status
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

    // Hitung biaya pendaftaran dan total
    const registrationFee = siswa.isFirstPurchase ? 95000 : 0;
    const total = paket.price + registrationFee;

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* Modern Invoice Styling */
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; padding: 30px; }
        
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .tagline { font-size: 14px; color: #7f8c8d; margin: 5px 0; }
        .contact-info { font-size: 12px; color: #95a5a6; }
        
        .recipient-section { margin-bottom: 30px; }
        .recipient-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .invoice-table th { 
          background-color: #3498db; 
          color: white; 
          text-align: left;
          padding: 12px 15px;
          border-bottom: 2px solid #2980b9;
        }
        .invoice-table td { 
          padding: 10px 15px;
          border-bottom: 1px solid #ecf0f1;
        }
        .invoice-table tr:nth-child(even) { background-color: #f8f9fa; }
        .total-row { font-weight: bold; background-color: #e3f2fd !important; }
        
        .bank-info { 
          background-color: #f8f9fa; 
          padding: 15px;
          border-radius: 5px;
          margin-top: 30px;
        }
        .bank-info-title { 
          font-weight: bold; 
          margin-bottom: 10px;
          color: #2c3e50;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-name">BIMBINGAN BELAJAR GALAKSI</div>
          <div class="tagline">Sahabat untuk Meraih Prestasi</div>
          <div class="contact-info">Tembalang Pesona Asri Blok A No. 24 Semarang | HP 0852-9236-5257</div>
        </div>
        
        <div class="recipient-section">
          <div class="recipient-title">Kepada Yth:</div>
          <div>${siswa.parentName}</div>
          <div>${siswa.address}</div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Deskripsi</th>
              <th style="text-align: right;">Harga</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${paket.name}</td>
              <td style="text-align: right;">Rp ${paket.price.toLocaleString('id-ID')}</td>
            </tr>
            ${siswa.isFirstPurchase ? `
            <tr>
              <td>2</td>
              <td>Biaya Pendaftaran</td>
              <td style="text-align: right;">Rp 95,000</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td style="text-align: right;">Rp ${total.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="bank-info">
          <div class="bank-info-title">Informasi Pembayaran:</div>
          <div>Silakan transfer ke rekening berikut:</div>
          <div>Mandiri: 1360005517518 | BCA: 8030101309</div>
          <div>BRI: 152901004279509 | BNI: 0905008548</div>
          <div>Bank Jateng: 2055067697 a.n. Edi Susanto</div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Generate PDF menggunakan Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlTemplate);
    
    const filePath = path.join(__dirname, '../../temp', `invoice-${invoiceId}.pdf`);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    return filePath;
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
