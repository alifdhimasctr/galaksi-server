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
  Siswa,
  Mapel, // NEW
} = require("../models");

const {
  DAY_NAME_TO_NUM,
  nextMatchingDate,
} = require("../../helper/dayMapping");
const { generateJadwal } = require("./JadwalService");
const { or } = require("sequelize");

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
    const order = await Order.create(orderData, { transaction: t });

    await t.commit();
    return order;
  } catch (err) {
    await t.rollback();
    throw new Error(`Gagal membuat order: ${err.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                                 UPDATE ORDER                               */
/* -------------------------------------------------------------------------- */

async function updateOrder(orderId, updates) {
  const t = await db.transaction();
  try {
    const order = await Order.findByPk(orderId, { lock: true, transaction: t });
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status === "Reject") throw new Error("Order sudah di‑reject");

    // Apply updates
    if (updates.tentorId) {
      const tentor = await Tentor.findByPk(updates.tentorId, { transaction: t }); 
      if (!tentor || tentor.status !== "active") {
        throw new Error("Tentor tidak valid / non‑aktif");
      }
      order.tentorId = updates.tentorId;
    }

    if (updates.meetingDay) {
      if (!Array.isArray(updates.meetingDay) || updates.meetingDay.length === 0) {
        throw new Error("meetingDay wajib diisi minimal satu hari");
      }
      order.meetingDay = updates.meetingDay;
    }


    if (updates.time) {
      order.time = updates.time;
      // Validasi format waktu
    }

    if (updates.mapel) {
      if (!Array.isArray(updates.mapel) || updates.mapel.length === 0) {
        throw new Error("mapel wajib diisi minimal satu mata pelajaran");
      }
      // Validasi setiap mapel
      for (const mapelId of updates.mapel) {
        const mapel = await Mapel.findByPk(mapelId, { transaction: t }); 
        if (!mapel) {
          throw new Error(`Mapel dengan ID ${mapelId} tidak ditemukan`);
        }
      }
      order.mapel = updates.mapel;
    }
    // Save updated order
    await order.save({ transaction: t });
    await t.commit();
    return order;
  } catch (err) {
    await t.rollback();
    throw new Error(`Gagal memperbarui order: ${err.message}`);
  }
}

async function deleteOrder(orderId) {
  const t = await db.transaction();
  try {
    const order = await Order.findByPk(orderId, { lock: true, transaction: t });
    if (!order) throw new Error("Order tidak ditemukan");

    await order.destroy({ transaction: t });
    await t.commit();
    return { message: "Order berhasil dihapus" };
  } catch (err) {
    await t.rollback();
    throw new Error(`Gagal menghapus order: ${err.message}`);
  }
}


/* -------------------------------------------------------------------------- */
/*                                APPROVE ORDER                               */
/* -------------------------------------------------------------------------- */
// orderservice.js
async function approveOrder(orderId, adminEdits = {}) {
  const t = await db.transaction();
  try {
    const order = await Order.findByPk(orderId, { 
      lock: true, 
      transaction: t 
    });
    
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status === "Approve") throw new Error("Order sudah di‑approve");


    // Apply admin edits if provided
    if (adminEdits.tentorId) {
      order.tentorId = adminEdits.tentorId;
    }
    
    if (adminEdits.meetingDay) {
      order.meetingDay = adminEdits.meetingDay;
    }
    
    if (adminEdits.time) {
      order.time = adminEdits.time;
    }
    
    if (adminEdits.mapel) {
      order.mapel = adminEdits.mapel;
    }

    // Verify the selected tentor
    const tentor = await Tentor.findByPk(order.tentorId, { transaction: t });
    if (!tentor || tentor.status !== "active") {
      throw new Error("Tentor tidak valid / non‑aktif");
    }

    // Verify the package
    const paket = await Paket.findByPk(order.paketId, { transaction: t });
    if (!paket || paket.status !== "Aktif") {
      throw new Error("Paket tidak ditemukan / non‑aktif");
    }

    // Update order status
    order.status = "Approve";
    await order.save({ transaction: t });

    // Create subscription
    const sub = await Subscription.create(
      {
        siswaId: order.siswaId,
        paketId: order.paketId,
        tentorId: order.tentorId,
        currentOrderId: order.id,
        remainingSessions: paket.totalSession,
      },
      { transaction: t }
    );

    const siswa = await Siswa.findByPk(order.siswaId, { transaction: t });
    if (!siswa) throw new Error("Siswa tidak ditemukan");
    
    const isFirstPurchase = siswa.isFirstPurchase;
    const adminFee = isFirstPurchase ? 95000 : 0;
    // Create invoice
    const inv = await Invoice.create(
      {
        orderId: order.id,
        siswaId: order.siswaId,
        subscriptionId: sub.id,
        paketId: paket.id,
        price: paket.price + adminFee,
        paymentStatus: "Unpaid",
      },
      { transaction: t }
    );

    // Generate schedule with updated details
    await generateJadwal(
      { 
        order: {
          ...order.get({ plain: true }),
          tentorId: order.tentorId,
          meetingDay: order.meetingDay,
          time: order.time
        }, 
        paket, 
        invoiceId: inv.id, 
        subscriptionId: sub.id 
      },
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
    
    const paketList = await Paket.findAll();
    const tentorList = await Tentor.findAll();
    const mapelList = await Mapel.findAll();
    const siswaList = await Siswa.findAll();
    const orderDetails = await Promise.all(
      orders.map(async (order) => {
        const paket = paketList.find((p) => p.id === order.paketId);
        const tentor = tentorList.find((t) => t.id === order.tentorId);
        const mapel = mapelList.filter((m) => order.mapel.includes(m.id));
        const siswa = siswaList.find((s) => s.id === order.siswaId);

        return {
          ...order.toJSON(),
          meetingDay: JSON.parse(order.meetingDay),
          siswa: siswa ? { id: siswa.id, name: siswa.name } : null,
          paket: paket ? { id: paket.id, name: paket.name } : null,
          tentor: tentor ? { id: tentor.id, name: tentor.name } : null,
          mapel: mapel.map((m) => ({ id: m.id, name: m.name })),
          meetingDay: JSON.parse(order.meetingDay),
        };
      })
    );
    return orderDetails;
  } catch (error) {
    throw new Error(`Error saat mendapatkan semua order: ${error.message}`);
  }
}

async function getOrderBySiswaId(siswaId) {
  try {

    const paketList = await Paket.findAll();
    const tentorList = await Tentor.findAll();
    const mapelList = await Mapel.findAll();
    const orders = await Order.findAll({
      where: { siswaId },
    });

    if (orders.length === 0) {
      throw new Error("Tidak ada order yang ditemukan untuk siswa ini");
    }

    const orderDetails = await Promise.all(
      orders.map(async (order) => {
        const paket = paketList.find((p) => p.id === order.paketId);
        const tentor = tentorList.find((t) => t.id === order.tentorId);
        const mapel = mapelList.filter((m) => order.mapel.includes(m.id));


        return {
          ...order.toJSON(),
          paket: paket ? { id: paket.id, name: paket.name } : null,
          tentor: tentor ? { id: tentor.id, name: tentor.name } : null,
          mapel: mapel.map((m) => ({ id: m.id, name: m.name })),
          meetingDay: JSON.parse(order.meetingDay),
          
        };
      })
    );

    return orderDetails;
  } catch (error) {
    throw new Error(`Error saat mendapatkan order: ${error.message}`);
  }
}

async function getOrderById(orderId) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order tidak ditemukan");

    const paket = await Paket.findByPk(order.paketId);
    const tentor = await Tentor.findByPk(order.tentorId);
    const siswa = await Siswa.findByPk(order.siswaId);
    const mapel = await Mapel.findAll();

    return {
      ...order.toJSON(),
      paket: paket ? { id: paket.id, name: paket.name } : null,
      tentor: tentor ? { id: tentor.id, name: tentor.name } : null,
      siswa: siswa ? { id: siswa.id, name: siswa.name, level: siswa.level} : null,
      meetingDay: JSON.parse(order.meetingDay),
      mapel: mapel.filter((m) => order.mapel.includes(m.id)).map((m) => ({
        id: m.id,
        name: m.name,
      })),
    };
  } catch (error) {
    throw new Error(`Error saat mendapatkan order: ${error.message}`);
  }
}

module.exports = {
  createOrder,
  approveOrder,
  updateOrder,
  deleteOrder,
  getOrderById,
  rejectOrder,
  getAllOrder,
  getOrderBySiswaId,
};
