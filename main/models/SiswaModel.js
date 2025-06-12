//SiswaModel.js

const { DataTypes } = require("sequelize");
const db = require("../../database/db");

const Siswa = db.define(
  "Siswa",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    mitraId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: process.env.DEFAULT_PASSWORD,
    },
    noHp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("L", "P"),
      allowNull: false,
    },
    parentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    parentJob: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    level: {
      type: DataTypes.ENUM("TK", "SD", "SMP", "SMA"),
      allowNull: false,
    },
    dateJoin: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    wallet: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "nonactive"),
      allowNull: false,
      defaultValue: "active",
    },
    isFirstPurchase: {  //baru
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    hooks: {
      beforeCreate: async (siswa) => {
        const lastSiswa = await Siswa.findOne({
          order: [["createdAt", "DESC"]],
        });
        let lastNumber = 0;
        if (lastSiswa && lastSiswa.id) {
          lastNumber = parseInt(lastSiswa.id.slice(2)) || 0;
        }
        const nextNumber = String(lastNumber + 1).padStart(4, "0");
        siswa.id = `SW${nextNumber}`;

        const nextNumber1 = String(lastNumber + 1).padStart(1, "0");

        siswa.username = siswa.name.toLowerCase().replace(/\s+/g, "");
        const existingUsername = await Siswa.findOne({
          where: { username: siswa.username },
        });
        if (existingUsername) {
          siswa.username = `${siswa.username}${nextNumber1}`;
        }
      },
    },
  }
);

// Siswa.sync({force: true})
//   .then(() => {
//     console.log("Siswa table created successfully!");
//   })
//   .catch((error) => {
//     console.error("Error creating Siswa table:", error);
//   });

module.exports = {
  Siswa,
};
