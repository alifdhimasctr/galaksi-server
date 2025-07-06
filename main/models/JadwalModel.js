// models/jadwal.js
const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const Jadwal = db.define('Jadwal', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  siswaId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tentorId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  invoiceId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subscriptionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dayName: {
    type: DataTypes.ENUM(
      'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
      // 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ),
    allowNull: false,
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  attendanceStatus: {
    type: DataTypes.ENUM('Present','PresentRequest', 'Absent', 'RescheduleRequest'),
    allowNull: false,
    defaultValue: 'Absent',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Jadwal.sync({ force: true}).then(() => {
//   console.log("Jadwal table created successfully!");
// }
// ).catch((error) => {
//   console.error("Error creating Jadwal table:", error);
// });

module.exports = {
  Jadwal
};
