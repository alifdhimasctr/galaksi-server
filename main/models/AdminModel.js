//AdminModel.js

const { DataTypes } = require("sequelize");
const db = require("../../database/db");

const Admin = db.define(
  "admin",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: process.env.DEFAULT_PASSWORD_ADMIN,
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
      beforeCreate: async (admin) => {
        const lastAdmin = await Admin.findOne({
          order: [["createdAt", "DESC"]],
        });
        let lastNumber = 0;
        if (lastAdmin && lastAdmin.id) {
          lastNumber = parseInt(lastAdmin.id.slice(2)) || 0;
        }
        const nextNumber = String(lastNumber + 1).padStart(4, "0");
        admin.id = `AD${nextNumber}`;

        const nextNumber1 = String(lastNumber + 1).padStart(1, "0");
        const existingUsername = await Admin.findOne({
          where: { username: admin.username },
        });
        if (existingUsername) {
          admin.username = `${admin.username}${nextNumber1}`;
        }
      },
    },
  }
);

// Admin.sync({ force: true })
//   .then(() => {
//     console.log("Admin table created");
//   })
//   .catch((error) => {
//     console.error("Error creating Admin table:", error);
//   });

module.exports = {
  Admin,
};
