const { Siswa } = require('./SiswaModel');
const { Paket } = require('./PaketModel');
const { Admin } = require('./AdminModel');
const { Honor } = require('./HonorModel');
const { Invoice } = require('./InvoiceModel');
const { Jadwal } = require('./JadwalModel');
const { Mitra } = require('./MitraModel');
const { Order } = require('./OrderModel');
const { Proshare } = require('./ProshareModel');
const { Subscription } = require('./SubscriptionModel');
const { Tentor } = require('./TentorModel');
const { Mapel } = require('./MapelModel');

module.exports = {
    Mapel, Siswa, Paket, Admin, Honor, Invoice, Jadwal, Mitra, Order, Proshare, Subscription, Tentor
}