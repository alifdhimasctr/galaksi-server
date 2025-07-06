//services/JadwalService.js
const {
  Tentor,
  Mitra,
  Subscription,
  Paket,
  Jadwal,
  Honor,
  Order,
  Invoice,
  Siswa,
  Proshare,
} = require("../models");

const {
  DAY_NAME_TO_NUM,
  nextMatchingDate,
} = require("../../helper/dayMapping");
const db = require("../../database/db");
const { fn, col } = require("sequelize");
const { lock } = require("../controllers/AuthController");

const WEEKDAY_STR = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const generateJadwal = async (
  { order, paket, invoiceId, subscriptionId },
  options = {}
) => {
  /* ---------- Validasi & mapping hari ---------- */
  let days = order.meetingDay;
  if (typeof days === "string") days = JSON.parse(days);

  if (!Array.isArray(days) || !days.length)
    throw new Error("Kolom meetingDay kosong / tidak valid");

  // → case‑insensitive
  const dayNums = days.map((d) => {
    const num = DAY_NAME_TO_NUM[d.toLowerCase()];
    if (num === undefined) throw new Error(`Hari tidak valid: ${d}`);
    return num;
  });

  /* ---------- Loop pembuatan jadwal ---------- */
  const total = paket.totalSession;
  const time = order.time; // 'HH:mm:ss'

  let sessions = 0;
  let cursor = new Date();
  let first = true;

  while (sessions < total) {
    let date = nextMatchingDate(cursor, dayNums, first);

    await Jadwal.create(
      {
        siswaId: order.siswaId,
        tentorId: order.tentorId,
        invoiceId,
        subscriptionId,
        date,
        time,
        dayName: WEEKDAY_STR[date.getDay()], // ← simpan nama hari
      },
      options
    );

    cursor = date;
    first = false;
    sessions += 1;
  }
};

/* -------------------------------------------------------------------------- */
/*                               PRESENT JADWAL                               */
/* -------------------------------------------------------------------------- */

async function requestPresentJadwal(jadwalId) {
  const t = await db.transaction();
  try {
    const jadwal = await Jadwal.findByPk(jadwalId, {
      lock: true,
      transaction: t,
    });

    const siswa = await Siswa.findByPk(jadwal.siswaId, {
      lock: true,
      transaction: t,
    });
    if (!siswa) throw new Error("Siswa tidak ditemukan");

    
    if (!jadwal) throw new Error("Jadwal tidak ditemukan");
    if (jadwal.attendanceStatus !== "Absent")
      throw new Error("Jadwal sudah dalam proses absen");

    const now = new Date();
    const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
    if (jadTime > now)
      throw new Error("Tidak bisa request absen sebelum jadwal dimulai");

    // Ubah status menjadi PresentRequest
    jadwal.attendanceStatus = "PresentRequest";
    await jadwal.save({ transaction: t });

    await t.commit();
    
    // Kembalikan data siswa untuk frontend
    return {
      success: true,
      message: "Permintaan presensi berhasil",
      siswa: {
        id: siswa.id,
        name: siswa.name,
        noHp: siswa.noHp,
        level: siswa.level,
        
      }
    };
  } catch (err) {
    await t.rollback();
    throw new Error(`${err.message}`);
  }
}

async function confirmPresentJadwal(jadwalId) {
  const t = await db.transaction();
  const { fn, col } = db.Sequelize;

  try {
    /* ---------- Ambil entitas utama & kunci row -------------------------- */
    const jadwal = await Jadwal.findByPk(jadwalId, {
      lock: true,
      transaction: t,
    });
    if (!jadwal) throw new Error("Jadwal tidak ditemukan");
    if (jadwal.attendanceStatus !== "PresentRequest")
      throw new Error("Jadwal Tidak Valid untuk diabsenkan");

    const now = new Date();
    const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
    if (jadTime > now)
      throw new Error("Tidak bisa absen sebelum jadwal dimulai");

    const subscription = await Subscription.findByPk(jadwal.subscriptionId, {
      lock: true,
      transaction: t,
    });
    if (!subscription) throw new Error("Subscription tidak ditemukan");
    if (subscription.status !== "Active")
      throw new Error("Subscription not active");

    const invoice = await Invoice.findByPk(jadwal.invoiceId, {
      lock: true,
      transaction: t,
    });
    if (!invoice) throw new Error("Invoice tidak ditemukan");

    const paket = await Paket.findByPk(subscription.paketId, {
      transaction: t,
    });
    if (!paket) throw new Error("Paket tidak ditemukan");

    const tentor = await Tentor.findByPk(jadwal.tentorId, {
      lock: true,
      transaction: t,
    });
    if (!tentor) throw new Error("Tentor tidak ditemukan");

    const siswa = await Siswa.findByPk(jadwal.siswaId, {
      lock: true,
      transaction: t,
    });
    if (!siswa) throw new Error("Siswa tidak ditemukan");

    const mitra =
      siswa.mitraId && siswa.mitraId !== ""
        ? await Mitra.findByPk(siswa.mitraId, { lock: true, transaction: t })
        : null;

    jadwal.attendanceStatus = "Present";
    await jadwal.save({ transaction: t });

    // Berikan honor langsung ke tentor per sesi
    tentor.wallet += paket.honorPrice;
    await tentor.save({ transaction: t });

    // Kurangi sisa sesi subscription
    subscription.remainingSessions -= 1;

    if (
      subscription.remainingSessions === 0 &&
      subscription.status !== "NonActive"
    ) {
      // Dapatkan order dari subscription (currentOrderId)
      const order = await Order.findByPk(subscription.currentOrderId, {
        transaction: t,
      });
      if (!order) throw new Error("Order tidak ditemukan");

      // Dapatkan paket baru dari order
      const newPaket = await Paket.findByPk(order.paketId, { transaction: t });
      if (!newPaket) throw new Error("Paket tidak ditemukan");

      // Reset subscription dengan data baru
      subscription.remainingSessions = newPaket.totalSession;
      subscription.tentorId = order.tentorId;
      subscription.paketId = order.paketId;
      await subscription.save({ transaction: t });

      // PROSES HONOR UNTUK SEMUA TENTOR YANG PERNAH MENGAJAR
      const honorMap = new Map();

      // Cari semua jadwal dalam invoice yang sama
      const jadwalsInInvoice = await Jadwal.findAll({
        where: {
          invoiceId: jadwal.invoiceId, // Fokus ke invoice saat ini
          attendanceStatus: "Present",
        },
        attributes: ["id", "tentorId"],
        transaction: t,
      });

      // Hitung jumlah sesi per tentor dalam invoice ini
      for (const j of jadwalsInInvoice) {
        const count = honorMap.get(j.tentorId) || 0;
        honorMap.set(j.tentorId, count + 1);
      }

      // Buat record honor untuk setiap tentor
      for (const [tentorId, sessions] of honorMap) {
        const totalHonor = sessions * paket.honorPrice;

        await Honor.create(
          {
            tentorId: tentorId,
            siswaId: siswa.id,
            invoiceId: invoice.id,
            total: totalHonor,
            status: "Pending",
          },
          { transaction: t }
        );
      }

      // PROSES PROSHARE UNTUK MITRA
      if (mitra) {
        const proshareTotal = paket.prosharePrice * paket.totalSession;
        mitra.wallet += proshareTotal;
        await mitra.save({ transaction: t });

        await Proshare.create(
          {
            mitraId: mitra.id,
            siswaId: siswa.id,
            invoiceId: invoice.id,
            total: proshareTotal,
            status: "Pending",
          },
          { transaction: t }
        );
      }

      // Buat invoice baru
      const newInvoice = await Invoice.create(
        {
          orderId: order.id,
          siswaId: order.siswaId,
          subscriptionId: subscription.id,
          paketId: newPaket.id,
          price: newPaket.price,
          paymentStatus: "Unpaid",
        },
        { transaction: t }
      );

      // Generate jadwal baru
      await generateJadwal(
        {
          order: order,
          paket: newPaket,
          invoiceId: newInvoice.id,
          subscriptionId: subscription.id,
        },
        { transaction: t }
      );
    } else {
      await subscription.save({ transaction: t });
    }

    await t.commit();
    return jadwal;
  } catch (err) {
    await t.rollback();
    throw new Error(`${err.message}`);
  }
}


// async function presentJadwal(jadwalId) {
//   const t = await db.transaction();
//   const { fn, col } = db.Sequelize;

//   try {
//     /* ---------- Ambil entitas utama & kunci row -------------------------- */
//     const jadwal = await Jadwal.findByPk(jadwalId, {
//       lock: true,
//       transaction: t,
//     });
//     if (!jadwal) throw new Error("Jadwal tidak ditemukan");
//     if (jadwal.attendanceStatus === "Present")
//       throw new Error("Jadwal Sudah Diabsenkan");

//     const now = new Date();
//     const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
//     if (jadTime > now)
//       throw new Error("Tidak bisa absen sebelum jadwal dimulai");

//     const subscription = await Subscription.findByPk(jadwal.subscriptionId, {
//       lock: true,
//       transaction: t,
//     });
//     if (!subscription) throw new Error("Subscription tidak ditemukan");
//     if (subscription.status !== "Active")
//       throw new Error("Subscription not active");

//     const invoice = await Invoice.findByPk(jadwal.invoiceId, {
//       lock: true,
//       transaction: t,
//     });
//     if (!invoice) throw new Error("Invoice tidak ditemukan");

//     const paket = await Paket.findByPk(subscription.paketId, {
//       transaction: t,
//     });
//     if (!paket) throw new Error("Paket tidak ditemukan");

//     const tentor = await Tentor.findByPk(jadwal.tentorId, {
//       lock: true,
//       transaction: t,
//     });
//     if (!tentor) throw new Error("Tentor tidak ditemukan");

//     const siswa = await Siswa.findByPk(jadwal.siswaId, {
//       lock: true,
//       transaction: t,
//     });
//     if (!siswa) throw new Error("Siswa tidak ditemukan");

//     const mitra =
//       siswa.mitraId && siswa.mitraId !== ""
//         ? await Mitra.findByPk(siswa.mitraId, { lock: true, transaction: t })
//         : null;

//     jadwal.attendanceStatus = "Present";
//     await jadwal.save({ transaction: t });

//     // Berikan honor langsung ke tentor per sesi
//     tentor.wallet += paket.honorPrice;
//     await tentor.save({ transaction: t });

//     // Kurangi sisa sesi subscription
//     subscription.remainingSessions -= 1;

//     if (
//       subscription.remainingSessions === 0 &&
//       subscription.status !== "NonActive"
//     ) {
//       // Dapatkan order dari subscription (currentOrderId)
//       const order = await Order.findByPk(subscription.currentOrderId, {
//         transaction: t,
//       });
//       if (!order) throw new Error("Order tidak ditemukan");

//       // Dapatkan paket baru dari order
//       const newPaket = await Paket.findByPk(order.paketId, { transaction: t });
//       if (!newPaket) throw new Error("Paket tidak ditemukan");

//       // Reset subscription dengan data baru
//       subscription.remainingSessions = newPaket.totalSession;
//       subscription.tentorId = order.tentorId;
//       subscription.paketId = order.paketId;
//       await subscription.save({ transaction: t });

//       // PROSES HONOR UNTUK SEMUA TENTOR YANG PERNAH MENGAJAR
//       const honorMap = new Map();

//       // Cari semua jadwal dalam invoice yang sama
//       const jadwalsInInvoice = await Jadwal.findAll({
//         where: {
//           invoiceId: jadwal.invoiceId, // Fokus ke invoice saat ini
//           attendanceStatus: "Present",
//         },
//         attributes: ["id", "tentorId"],
//         transaction: t,
//       });

//       // Hitung jumlah sesi per tentor dalam invoice ini
//       for (const j of jadwalsInInvoice) {
//         const count = honorMap.get(j.tentorId) || 0;
//         honorMap.set(j.tentorId, count + 1);
//       }

//       // Buat record honor untuk setiap tentor
//       for (const [tentorId, sessions] of honorMap) {
//         const totalHonor = sessions * paket.honorPrice;

//         await Honor.create(
//           {
//             tentorId: tentorId,
//             siswaId: siswa.id,
//             invoiceId: invoice.id,
//             total: totalHonor,
//             status: "Pending",
//           },
//           { transaction: t }
//         );
//       }

//       // PROSES PROSHARE UNTUK MITRA
//       if (mitra) {
//         const proshareTotal = paket.prosharePrice * paket.totalSession;
//         mitra.wallet += proshareTotal;
//         await mitra.save({ transaction: t });

//         await Proshare.create(
//           {
//             mitraId: mitra.id,
//             siswaId: siswa.id,
//             invoiceId: invoice.id,
//             total: proshareTotal,
//             status: "Pending",
//           },
//           { transaction: t }
//         );
//       }

//       // Buat invoice baru
//       const newInvoice = await Invoice.create(
//         {
//           orderId: order.id,
//           siswaId: order.siswaId,
//           subscriptionId: subscription.id,
//           paketId: newPaket.id,
//           price: newPaket.price,
//           paymentStatus: "Unpaid",
//         },
//         { transaction: t }
//       );

//       // Generate jadwal baru
//       await generateJadwal(
//         {
//           order: order,
//           paket: newPaket,
//           invoiceId: newInvoice.id,
//           subscriptionId: subscription.id,
//         },
//         { transaction: t }
//       );
//     } else {
//       await subscription.save({ transaction: t });
//     }

//     await t.commit();
//     return jadwal;
//   } catch (err) {
//     await t.rollback();
//     throw new Error(`${err.message}`);
//   }
// }

async function rescheduleJadwal(jadwalId, newDate, newTime) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal Tidak Ditemukan");

  const now = new Date();
  const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
  if (jadTime < now) throw new Error("Cannot reschedule a past jadwal");
  const dayName = WEEKDAY_STR[new Date(newDate).getDay()]; // simpan nama hari baru

  jadwal.date = newDate;
  jadwal.time = newTime;
  jadwal.dayName = dayName; // update nama hari

  await jadwal.save();

  return jadwal;
}

async function rescheduleTentor(jadwalId) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal tidak ditemukan");

  const now = new Date();
  const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
  if (jadTime < now) throw new Error("Cannot reschedule a past jadwal");

  jadwal.attendanceStatus = "RescheduleRequest";
  await jadwal.save();

  return jadwal;
}

async function approveRescheduleTentor(jadwalId, newTentorId) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal tidak ditemukan");
  const tentor = await Tentor.findByPk(newTentorId);
  if (!tentor) throw new Error("Tentor tidak ditemukan");

  const now = new Date();
  const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
  if (jadTime < now) throw new Error("Cannot reschedule a past jadwal");

  jadwal.tentorId = newTentorId;
  if (jadwal.attendanceStatus !== "RescheduleRequest")
    throw new Error("Jadwal not in reschedule request status");

  jadwal.attendanceStatus = "Absent";
  await jadwal.save();

  return jadwal;
}

async function rejectRescheduleTentor(jadwalId) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal tidak ditemukan");

  const now = new Date();
  const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
  if (jadTime < now) throw new Error("Cannot reschedule a past jadwal");

  if (jadwal.attendanceStatus !== "RescheduleRequest")
    throw new Error("Jadwal not in reschedule request status");

  jadwal.attendanceStatus = "Absent";
  await jadwal.save();

  return jadwal;
}

const getJadwalByInvoiceId = async (invoiceId) => {
  const jadwal = await Jadwal.findAll({ where: { invoiceId } });
  if (!jadwal) throw new Error("Jadwal tidak ditemukan");

  return jadwal;
};

const getAllJadwal = async (status) => {
  const whereClause = status ? { attendanceStatus: status } : {};
  const jadwal = await Jadwal.findAll({
    where: whereClause,
    order: [
      [fn("FIELD", col("attendanceStatus"), "RescheduleRequest"), "DESC"], // Prioritize RescheduleRequest
      ["date", "ASC"],
      ["time", "ASC"],
    ],
  });
  const tentor = await Tentor.findAll();
  const siswa = await Siswa.findAll();

  const mappedJadwal = jadwal.map((j) => {
    const tentorData = tentor.find((t) => t.id === j.tentorId);
    const siswaData = siswa.find((s) => s.id === j.siswaId);

    return {
      ...j.toJSON(),
      tentorName: tentorData ? `${tentorData.name}` : null,
      siswaName: siswaData ? `${siswaData.name}` : null,
    };
  });

  return mappedJadwal;
};

const getJadwalByTentorId = async (tentorId) => {
  const jadwal = await Jadwal.findAll({ where: { tentorId },order: [["date", "ASC"], ["time", "ASC"]] });
  if (!jadwal) throw new Error("Jadwal tidak ditemukan");

  const siswa = await Siswa.findAll();
  const mappedJadwal = jadwal.map((j) => {
    const siswaData = siswa.find((s) => s.id === j.siswaId);

    return {
      ...j.toJSON(),
      siswaName: siswaData ? `${siswaData.name}` : null,
    };
  });

  return mappedJadwal;
};

const getJadwalBySiswaId = async (siswaId) => {
  const jadwal = await Jadwal.findAll({ where: { siswaId }, order: [["date", "ASC"], ["time", "ASC"]] });
  if (!jadwal) throw new Error("Jadwal tidak ditemukan");

  const tentor = await Tentor.findAll();
  const mappedJadwal = jadwal.map((j) => {
    const tentorData = tentor.find((t) => t.id === j.tentorId);

    return {
      ...j.toJSON(),
      tentorName: tentorData ? `${tentorData.name}` : null,
    };
  });

  return mappedJadwal;
}

const getJadwalById = async (id) => {
  const jadwal = await Jadwal.findByPk(id);
  if (!jadwal) throw new Error("Jadwal tidak ditemukan");

  const tentor = await Tentor.findByPk(jadwal.tentorId);
  const siswa = await Siswa.findByPk(jadwal.siswaId);

  if (!tentor) throw new Error("Tentor tidak ditemukan");
  if (!siswa) throw new Error("Siswa tidak ditemukan");
  return {
    ...jadwal.toJSON(),
    tentor : {
      id: tentor.id,
      name: tentor.name,
    },
    siswa: {
      id: siswa.id,
      name: siswa.name,
      level: siswa.level,
    },
  };
};

module.exports = {
  generateJadwal,
  // presentJadwal,
  requestPresentJadwal,
  confirmPresentJadwal,
  rescheduleJadwal,
  rescheduleTentor,
  approveRescheduleTentor,
  rejectRescheduleTentor,
  getJadwalByInvoiceId,
  getAllJadwal,
  getJadwalByTentorId,
  getJadwalBySiswaId,
  getJadwalById,
};
