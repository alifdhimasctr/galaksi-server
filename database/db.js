const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const db = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER, 
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectModule: mysql2,
    port: process.env.DB_PORT,
    pool: { // 👇 Tambahkan konfigurasi pool
      max: 5,     // Maksimal 5 koneksi
      min: 0,
      acquire: 30000,
      idle: 10000, // Tutup koneksi setelah 10 detik idle
      connectTimeout: 30000 // Waktu tunggu koneksi 20 detik
    },
    dialectOptions: {
      dateStrings: true,
      typeCast(field, next) {
        if (field.type === "DATE") {
          return field.string();
        }
        return next();
      },
    },
    timezone: "+07:00",
    logging: false // 👈 Nonaktifkan logging query
  }
);

// Fungsi untuk menguji koneksi
const testConnection = async () => {
  try {
    await db.authenticate();
    console.log("Koneksi ke database berhasil.");
  } catch (err) {
    console.error("Tidak dapat terhubung ke database:", err.message);
  }
};

testConnection();

module.exports = db;


