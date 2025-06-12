// models/invoice.js
const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const Invoice = db.define('Invoice', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  siswaId:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subscriptionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paketId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price:{
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  paymentStatus: {
    type: DataTypes.ENUM('Paid', 'Unpaid'),
    allowNull: false,
    defaultValue: 'Unpaid',
  },
  paymentDate:{
    type: DataTypes.DATE,
    allowNull: true,  
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
}, {
  hooks: {
    beforeCreate: async (invoice) => {
      const lastInvoice = await Invoice.findOne({ order: [['createdAt', 'DESC']] });
      let lastNumber = 0;
      if (lastInvoice && lastInvoice.id) {
        lastNumber = parseInt(lastInvoice.id.slice(2)) || 0;
      }
      const nextNumber = String(lastNumber + 1).padStart(4, '0');
      invoice.id = `IV-${Date.now()}${nextNumber}`;
    }
  }
});


// Invoice.sync({ force: true })
//   .then(() => {
//     console.log("Invoice table created or updated successfully.");
//   })
//   .catch((error) => {
//     console.error("Error creating or updating Invoice table:", error);
//   });

module.exports = {
  Invoice
};
