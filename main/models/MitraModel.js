// models/mitra.js
const { DataTypes } = require("sequelize");
const db = require("../../database/db");

const Mitra = db.define(
  "Mitra",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: function () {
        return this.name ? this.name.toLowerCase().replace(/\s+/g, "") : null;
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "nonactive"),
      allowNull: false,
      defaultValue: "active",
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    noHp: {
      type: DataTypes.STRING,
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
      beforeCreate: async (mitra) => {
      const lastMitra = await Mitra.findOne({
        order: [["createdAt", "DESC"]],
      });
      let lastNumber = 0;
      if (lastMitra && lastMitra.id) {
        lastNumber = parseInt(lastMitra.id.slice(2)) || 0;
      }
      const nextNumber = String(lastNumber + 1).padStart(4, "0");
      mitra.id = `MT${nextNumber}`;

      const nextNumber1 = String(lastNumber + 1).padStart(1, "0");
      mitra.username = mitra.name.toLowerCase().replace(/\s+/g, "");
      const existingUsername = await Mitra.findOne({
        where: {
          username: mitra.username,
        },
      });
      if (existingUsername) {
        mitra.username = `${mitra.username}${nextNumber1}`;
      }
      }
    },
  },
);

// Mitra.sync({ force: true })
//   .then(() => {
//     console.log("Mitra table created successfully!");
//   })
//   .catch((error) => {
//     console.error("Error creating Mitra table:", error);
//   });


module.exports = {
  Mitra,
};
