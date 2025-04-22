// services/ProshareService.js
const { Proshare, Mitra } = require('../models');
const db = require("../../database/db");

const processProsharePayment = async (proshareId, transferProof) => {
  const t = await db.transaction();

  try {

    const proshare = await Proshare.findByPk(proshareId, { transaction: t });
    if (!proshare) throw new Error("Proshare tidak ditemukan");

    proshare.paymentStatus = 'Paid';
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

const getProshareDetails = async(proshareId) => {
    const proshare = await Proshare.findByPk(proshareId);
    if (!proshare) throw new Error("Proshare tidak ditemukan");

    return proshare;
}



module.exports = {
    processProsharePayment,
    getProshareDetails
};
