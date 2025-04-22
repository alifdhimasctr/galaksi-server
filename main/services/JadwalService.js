//services/JadwalService.js
const { Tentor, Mitra, Subscription, Paket, Jadwal, Honor, Order, Invoice, Siswa, Proshare } = require("../models");

const {
  DAY_NAME_TO_NUM,
  nextMatchingDate,
} = require("../../helper/dayMapping");
const db = require("../../database/db");
const { fn, col } = require("sequelize");
const { lock } = require("../controllers/AuthController");

const WEEKDAY_STR = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const generateJadwal = async (
  { order, paket, invoiceId, subscriptionId },
  options = {}
) => {
  /* ---------- Validasi & mapping hari ---------- */
  let days = order.meetingDay;
  if (typeof days === 'string') days = JSON.parse(days);

  if (!Array.isArray(days) || !days.length)
    throw new Error('Kolom meetingDay kosong / tidak valid');

  // → case‑insensitive
  const dayNums = days.map(d => {
    const num = DAY_NAME_TO_NUM[d.toLowerCase()];
    if (num === undefined) throw new Error(`Hari tidak valid: ${d}`);
    return num;
  });

  /* ---------- Loop pembuatan jadwal ---------- */
  const total = paket.totalSession;
  const time  = order.time;         // 'HH:mm:ss'

  let sessions = 0;
    let cursor   = new Date();
  let first    = true;

  while (sessions < total) {
    let date = nextMatchingDate(cursor, dayNums, first);

    await Jadwal.create(
      {
        siswaId:   order.siswaId,
        tentorId:  order.tentorId,
        invoiceId,
        subscriptionId,
        date,
        time,
        dayName: WEEKDAY_STR[date.getDay()],   // ← simpan nama hari
      },
      options
    );

    cursor  = date;
    first   = false;
    sessions += 1;
  }
};

/* -------------------------------------------------------------------------- */
/*                               PRESENT JADWAL                               */
/* -------------------------------------------------------------------------- */
async function presentJadwal(jadwalId) {
  const t = await db.transaction();

  try {
    /* ---------- Ambil entitas utama & kunci row -------------------------- */
    const jadwal = await Jadwal.findByPk(jadwalId, { lock: true, transaction: t });
    if (!jadwal) throw new Error("Jadwal not found");
    if (jadwal.attendanceStatus === "Present")
      throw new Error("Jadwal already marked as present");

    const subscription = await Subscription.findByPk(jadwal.subscriptionId, {
      lock: true,
      transaction: t,
    });
    if (!subscription) throw new Error("Subscription not found");
    if (subscription.status !== "Active")
      throw new Error("Subscription not active");

    const invoice = await Invoice.findByPk(jadwal.invoiceId, {
      lock: true,
      transaction: t,
    });
    if (!invoice) throw new Error("Invoice not found");
    

    const paket = await Paket.findByPk(subscription.paketId, { transaction: t });
    if (!paket) throw new Error("Paket not found");

    const tentor = await Tentor.findByPk(jadwal.tentorId, {
      lock: true,
      transaction: t,
    });
    if (!tentor) throw new Error("Tentor not found");

    const siswa = await Siswa.findByPk(jadwal.siswaId, {
      lock: true,
      transaction: t,
    });

    if (!siswa) throw new Error("Siswa not found")

    const mitra =
      siswa.mitraId && siswa.mitraId !== ""
        ? await Mitra.findByPk(siswa.mitraId, { lock: true, transaction: t })
        : null;

    jadwal.attendanceStatus = "Present";
    await jadwal.save({ transaction: t });

    tentor.wallet += paket.honorPrice;
    await tentor.save({ transaction: t });

    subscription.remainingSessions -= 1;
  
    if (subscription.remainingSessions === 0) {
      if (mitra) {
        const proshareTotal = paket.prosharePrice * paket.totalSession;
        mitra.wallet += proshareTotal;
        await mitra.save({ transaction: t });

        await Proshare.create(
          {
            mitraId: mitra.id,
            total:   proshareTotal,
            status:  "Pending",
          },
          { transaction: t }
        );
      }

      const honorRows = await Jadwal.findAll({
        where: {
          subscriptionId: subscription.id,
          attendanceStatus: "Present",
        },
        attributes: [
          "tentorId",
          [fn("COUNT", col("tentorId")), "sessions"],
        ],
        group: ["tentorId"],
        transaction: t,
      });

      for (const row of honorRows) {
        const totalHonor = row.get("sessions") * paket.honorPrice;
        await Honor.create(
          {
            tentorId: row.get("tentorId"),
            total:    totalHonor,
            status:   "Pending",
          },
          { transaction: t }
        );
      }

      const order = await Order.findByPk(invoice.orderId, { transaction: t });
      const newInvoice = await Invoice.create(
        {
          orderId:        order.id,
          subscriptionId: subscription.id,
          paketId:        paket.id,
          paymentStatus:  "Unpaid",
        },
        { transaction: t }
      );


      subscription.remainingSessions = paket.totalSession;
      await subscription.save({ transaction: t });

      await generateJadwal(
        { order: order, paket, invoiceId: newInvoice.id, subscriptionId: subscription.id },
        { transaction: t }
      );
    } else {
     
      await subscription.save({ transaction: t });
    }

    await t.commit();
    return jadwal;
  } catch (err) {
    await t.rollback();
    throw new Error(`Present Jadwal gagal: ${err.message}`);
  }
}

async function rescheduleJadwal(jadwalId, newDate, newTime) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal not found");

  const now      = new Date();
  const jadTime  = new Date(`${jadwal.date}T${jadwal.time}`);
  if (jadTime < now) throw new Error("Cannot reschedule a past jadwal");
  const dayName = WEEKDAY_STR[new Date(newDate).getDay()]; // simpan nama hari baru 

  jadwal.date = newDate;
  jadwal.time = newTime;
  
  await jadwal.save();

  return jadwal;
}


async function rescheduleTentor(jadwalId) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal not found");

  const now     = new Date();
  const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
  if (jadTime < now) throw new Error("Cannot reschedule a past jadwal");

  jadwal.attendanceStatus = "RescheduleRequest";
  await jadwal.save();

  return jadwal;
}

async function approveRescheduleTentor(jadwalId, newTentorId) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal not found");
  const tentor = await Tentor.findByPk(newTentorId);
  if (!tentor) throw new Error("Tentor not found");

  const now     = new Date();
  const jadTime = new Date(`${jadwal.date}T${jadwal.time}`);
  if (jadTime < now) throw new Error("Cannot reschedule a past jadwal");

  jadwal.tentorId        = newTentorId;
  if (jadwal.attendanceStatus !== "RescheduleRequest")
    throw new Error("Jadwal not in reschedule request status");

  jadwal.attendanceStatus = "Absent";
  await jadwal.save();

  return jadwal;
}

async function rejectRescheduleTentor(jadwalId) {
  const jadwal = await Jadwal.findByPk(jadwalId);
  if (!jadwal) throw new Error("Jadwal not found");

  const now     = new Date();
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
  if (!jadwal) throw new Error("Jadwal not found");

  return jadwal;
};


module.exports = {
  generateJadwal,
  presentJadwal,
  rescheduleJadwal,
  rescheduleTentor,
  approveRescheduleTentor,
  rejectRescheduleTentor,
  getJadwalByInvoiceId,
};