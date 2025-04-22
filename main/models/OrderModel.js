// models/order.js
const { DataTypes, DATEONLY } = require('sequelize');
const db = require("../../database/db");

const Order = db.define('Order', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  siswaId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paketId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tentorId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  meetingDay: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  mapel: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('NonApprove', 'Approve','Reject'),
    allowNull: false,
    defaultValue: 'NonApprove',
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

    beforeValidate: async (order, options) => {

      if (order.id) return;


      const last = await Order.findOne({
        where:  { siswaId: order.siswaId },
        order:  [['createdAt', 'DESC']],
        attributes: ['id'],
        transaction: options?.transaction,
      });

      let lastNum = 0;
      if (last?.id) {
        const parts = last.id.split('-');     
        lastNum = parseInt(parts.pop(), 10) || 0;  
      }

      let nextNum = lastNum + 1;
      let newId;

      do {
        newId = `OR-${order.siswaId}-${String(nextNum).padStart(4, '0')}`;

        const exist = await Order.findByPk(newId, { transaction: options?.transaction });
        if (!exist) break;

        nextNum++;
      } while (true);

      order.id = newId;
    },
  },
});

// Order.sync({ force: true }).then(() => {
//   console.log('Order table created successfully!');
// }).catch((error) => {
//   console.error('Error creating Order table:', error);
// });


module.exports = {
  Order
};
