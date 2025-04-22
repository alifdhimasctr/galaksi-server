// models/honor.js
const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const Honor = db.define('Honor', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: function () {
      return `HNR-${Date.now()}${Math.floor(Math.random() * 10000)}`; // Generate a unique ID
    },
  },
  tentorId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  total: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Paid'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  paymentStatus: {  
    type: DataTypes.ENUM('Pending', 'Paid'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  transferProof: {  
    type: DataTypes.STRING,
    allowNull: true,
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

// Honor.sync({ force: true })
//   .then(() => {
//     console.log("Honor table created successfully!");
//   })
//   .catch((error) => {
//     console.error("Error creating Honor table:", error);
//   });

module.exports = { Honor };
