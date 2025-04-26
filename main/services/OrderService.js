// services/OrderService.js
const dayjs = require("dayjs");
const weekday = require("dayjs/plugin/weekday");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const db = require("../../database/db");

// ===== Models ================================================================
const {
  Order,
  Paket,
  Subscription,
  Invoice,
  Jadwal,
  Tentor, // NEW
  Siswa, // NEW
} = require("../models");

const {
  DAY_NAME_TO_NUM,
  nextMatchingDate,
} = require("../../helper/dayMapping");
const { generateJadwal } = require("./JadwalService");

dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);

/* -------------------------------------------------------------------------- */
/*                              HELPER VALIDATION                             */
/* -------------------------------------------------------------------------- */
async function validateOrderPayload(payload) {
  // --- Siswa wajib ada ------------------------------------------------------
  const siswa = await Siswa.findByPk(payload.siswaId);
  if (!siswa) throw new Error("Siswa tidak ditemukan");

  // --- Paket wajib ada & aktif dan harus sesuai level
  const paket = await Paket.findByPk(payload.paketId);
  if (!paket || paket.status !== "Aktif")
    throw new Error("Paket tidak ditemukan / non‑aktif");

  // --- Tentor: boleh null, tapi bila ada harus valid & aktif ---------------
  if (payload.tentorId) {
    const tentor = await Tentor.findByPk(payload.tentorId);
    if (!tentor || tentor.status !== "active")
      throw new Error("Tentor tidak valid / non‑aktif");
  }

  // --- meetingDay & mapel minimal satu nilai --------------------------------
  if (!Array.isArray(payload.meetingDay) || payload.meetingDay.length === 0) {
    throw new Error("meetingDay wajib diisi minimal satu hari");
  }
  if (!Array.isArray(payload.mapel) || payload.mapel.length === 0) {
    throw new Error("mapel wajib diisi minimal satu mata pelajaran");
  }

  // Kalau lolos semua, kembalikan paket utk dipakai caller
  return paket;
}

/* -------------------------------------------------------------------------- */
/*                                 CREATE ORDER                               */
/* -------------------------------------------------------------------------- */
async function createOrder(orderData) {
  const t = await db.transaction();
  try {
    const paket = await validateOrderPayload(orderData); // NEW
    // Insert order
    const order = await Order.create(orderData, { transaction: t });

    await t.commit();
    return order;
  } catch (err) {
    await t.rollback();
    throw new Error(`Gagal membuat order: ${err.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                                APPROVE ORDER                               */
/* -------------------------------------------------------------------------- */
async function approveOrder(orderId) {
  const t = await db.transaction();
  try {
    const order = await Order.findByPk(orderId, { lock: true, transaction: t });
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status === "Approve") throw new Error("Order sudah di‑approve");

    const paket = await Paket.findByPk(order.paketId, { transaction: t });
    if (!paket || paket.status !== "Aktif")
      throw new Error("Paket tidak ditemukan / non‑aktif");

    const tentor = await Tentor.findByPk(order.tentorId, { transaction: t });
    if (!tentor || tentor.status !== "active")
      throw new Error("Tentor tidak valid / non‑aktif");

    order.status = "Approve";
    await order.save({ transaction: t });

    const sub = await Subscription.create(
      {
        siswaId: order.siswaId,
        paketId: order.paketId,
        tentorId: order.tentorId,
        remainingSessions: paket.totalSession,
      },
      { transaction: t }
    );

    const inv = await Invoice.create(
      {
        orderId: order.id,
        subscriptionId: sub.id,
        paketId: paket.id,
        paymentStatus: "Unpaid",
      },
      { transaction: t }
    );

    await generateJadwal(
      { order, paket, invoiceId: inv.id, subscriptionId: sub.id },
      { transaction: t }
    );

    await t.commit();
    return { order, sub, inv };
  } catch (err) {
    await t.rollback();
    throw new Error(`Error saat approve order: ${err.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                                REJECT ORDER                                */
/* -------------------------------------------------------------------------- */
async function rejectOrder(orderId) {
  
    const t = await db.transaction();
    try {
      const order = await Order.findByPk(orderId, { lock: true, transaction: t });
      if (!order) throw new Error("Order tidak ditemukan");
      if (order.status === "Reject") throw new Error("Order sudah di‑reject");
  
      order.status = "Reject";
      await order.save({ transaction: t });
  
      await t.commit();
      return order;
    } catch (err) {
      await t.rollback();
      throw new Error(`Error saat reject order: ${err.message}`);
    }
  }

/* -------------------------------------------------------------------------- */
/*                                GET ALL ORDER                               */
/* -------------------------------------------------------------------------- */
async function getAllOrder(status) {
  try {
    let orders;
    switch (status) {
      case "all":
        orders = await Order.findAll();
        break;
      case "Approve":
        orders = await Order.findAll({
          where: { status: "Approve" },
        });
        break;
      case "NonApprove":
        orders = await Order.findAll({
          where: { status: "NonApprove" },
        });
        break;
      case "Reject":
        orders = await Order.findAll({
          where: { status: "Reject" },
        });
        break;
      default: throw new Error("Status tidak valid");  
    }
    if (orders.length === 0) {
      throw new Error("Tidak ada order yang ditemukan");
    }
    return orders;
  } catch (error) {
    throw new Error(`Error saat mendapatkan semua order: ${error.message}`);
  }
}

module.exports = {
  createOrder,
  approveOrder,
  rejectOrder,
  getAllOrder,
};
