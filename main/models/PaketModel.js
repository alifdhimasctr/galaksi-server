const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const calculatePrices = (paket) => {
  if (paket.price && paket.totalSession) {
    const honorPerSession = Math.round((paket.price * 0.6) / paket.totalSession);
    const prosharePerSession = Math.round((paket.price * 0.1) / paket.totalSession);
    
    paket.honorPrice = honorPerSession;
    paket.prosharePrice = prosharePerSession;
  }
};

const Paket = db.define('Paket', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('Kurikulum Nasional', 'Kurikulum Internasional', 'Life Skill', 'Bahasa Asing'),
    allowNull: false,
  },
  level: {
    type: DataTypes.ENUM('TK', 'SD', 'SMP', 'SMA', 'SNBT','OTHER'),
    allowNull: false,
  },
  totalSession: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  honorPrice: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  prosharePrice:{
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Aktif', 'Nonaktif'),
    allowNull: false,
    defaultValue: 'Aktif',
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
    beforeValidate(paket) {
      if (paket.isNewRecord) {
        calculatePrices(paket);
      }
    },
    beforeBulkCreate(pakets) {
      pakets.forEach(paket => {
        if (paket.isNewRecord) {
          calculatePrices(paket);
        }
      });
    }
  },
});

// Paket.sync({ force: true }).then(() => {
//   console.log("Paket table created successfully!");
// }).catch((error) => {
//   console.error("Error creating Paket table:", error);
// });

module.exports = {
  Paket
};