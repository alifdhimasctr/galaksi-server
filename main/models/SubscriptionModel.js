// models/subscription.js
const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const Subscription = db.define('Subscription', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  siswaId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  currentOrderId: {
  type: DataTypes.STRING,
  allowNull: false
},
  paketId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tentorId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  remainingSessions: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'NonActive'),
    allowNull: false,
    defaultValue: 'Active',
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
    beforeCreate: async (subscription) => {
      const lastSubscription = await Subscription.findOne({ order: [['createdAt', 'DESC']] });
      let lastNumber = 0;
      if (lastSubscription && lastSubscription.id) {
        lastNumber = parseInt(lastSubscription.id.slice(2)) || 0;
      }
      const nextNumber = String(lastNumber + 1).padStart(4, '0');
      subscription.id = `SB-${Date.now()}${nextNumber}`;
    }
  }
});

// Subscription.sync({ force: true }).then(() => {
//   console.log("Subscription table created successfully!");
// }).catch((error) => {
//   console.error("Error creating Subscription table:", error);  
// }

// );

module.exports = {
  Subscription
};
