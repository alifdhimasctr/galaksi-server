// models/invoice.js
const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const Invoice = db.define('Invoice', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
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
  paymentStatus: {
    type: DataTypes.ENUM('Paid', 'Unpaid'),
    allowNull: false,
    defaultValue: 'Unpaid',
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

module.exports = {
  Invoice
};
