const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");
dotenv.config();

const db = new Sequelize(
  process.env.DB_NAME, // 'galaksi'
  process.env.DB_USER, // 'root'
  process.env.DB_PASSWORD, // '@AsRf128'
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT,
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
