// models/tentor.js
const { DataTypes } = require("sequelize");
const db = require("../../database/db");

const Tentor = db.define(
  "Tentor",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: function () {
        return this.name ? this.name.toLowerCase().replace(/\s+/g, "") : null;
      }
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
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    faculty: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    university: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    level: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    mapel:{
      type: DataTypes.JSON,
      allowNull: false,
    },
    schedule: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    dateJoin: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM("active", "nonactive"),
      allowNull: false,
      defaultValue: "active",
    },
    wallet: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bankNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    foto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ktp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sim: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cv: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fotoUrl: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${process.env.BASE_URL}/uploads/tentor/${this.getDataValue('foto')}`;
      },
      set(value) { throw new Error('Do not try to set `fotoUrl`'); }
    },
    ktpUrl: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${process.env.BASE_URL}/uploads/tentor/${this.getDataValue('ktp')}`;
      },
      set(value) { throw new Error('Do not try to set `ktpUrl`'); }
    },
    simUrl: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${process.env.BASE_URL}/uploads/tentor/${this.getDataValue('sim')}`;
      },
      set(value) { throw new Error('Do not try to set `simUrl`'); }
    },
    cvUrl: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${process.env.BASE_URL}/uploads/tentor/${this.getDataValue('cv')}`;
      },
      set(value) { throw new Error('Do not try to set `cvUrl`'); }
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
      beforeValidate: async (tentor) => {
        const lastTentor = await Tentor.findOne({
          order: [["createdAt", "DESC"]],
        });
        let lastNumber = 0;
        if (lastTentor && lastTentor.id) {
          lastNumber = parseInt(lastTentor.id.slice(2)) || 0;
        }
        const nextNumber = String(lastNumber + 1).padStart(4, "0");
        tentor.id = `TN${nextNumber}`;

        const nextNumber1 = String(lastNumber + 1).padStart(1, "0");
        tentor.username = tentor.name.toLowerCase().replace(/\s+/g, "");
        const existingUsername = await Tentor.findOne({
          where: {
            username: tentor.username,
          },
        });
        if (existingUsername) {
          tentor.username = `${tentor.username}${nextNumber1}`;
        }
      },
    },
  }
);

// Tentor.sync({force: true})
//   .then(() => {
//     console.log("Tentor table created");
//   })
//   .catch((error) => {
//     console.error("Error creating Tentor table:", error);
//   });

module.exports = {
  Tentor,
};
