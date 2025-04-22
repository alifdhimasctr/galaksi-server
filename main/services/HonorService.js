// services/HonorService.js
const { Honor, Tentor, Order, Proshare } = require('../models');
const db = require("../../database/db");

const processHonorPayment = async (honorId, transferProof) => {
  const t = await db.transaction();

  try {
    const honor = await Honor.findByPk(honorId, { transaction: t });
    if (!honor) throw new Error("Honor tidak ditemukan");

    amount = honor.total;

    honor.paymentStatus = 'Paid';
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



const getHonorDetails = async (honorId) => {
    const honor = await Honor.findByPk(honorId);
    if (!honor) throw new Error("Honor tidak ditemukan");
  
    return honor;
  };



module.exports = {
    processHonorPayment,
    getHonorDetails,
};
