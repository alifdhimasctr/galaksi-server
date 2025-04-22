// models/proshare.js
const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const Proshare = db.define('Proshare', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: function () {
      return `PS-${Date.now()}${Math.floor(Math.random() * 10000)}`; 
    },
  },
  mitraId: {
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

// Proshare.sync({ force: true })
//   .then(() => {
//     console.log("Proshare table created successfully!");
//   })
//   .catch((error) => {
//     console.error("Error creating Proshare table:", error);
//   });

module.exports = {
  Proshare
};
