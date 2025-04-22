//PaketModel.js

const { DataTypes } = require('sequelize');
const db = require("../../database/db");

const Paket = db.define('Paket', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
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
    type: DataTypes.ENUM('TK', 'SD', 'SMP', 'SMA', 'SNBT'),
    allowNull: true, // Tidak semua paket membutuhkan level
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
    async beforeValidate(paket) {       
      const last = await Paket.findOne({ order: [['createdAt', 'DESC']] });
      const lastNum  = last?.id ? parseInt(last.id.slice(3)) || 0 : 0;   // slice(3) krn 'PK-'
      paket.id = `PK-${String(lastNum + 1).padStart(4,'0')}`;

      
      paket.honorPrice = Math.round((paket.price * 0.6) / paket.totalSession);
      paket.prosharePrice = Math.round((paket.price * 0.1) / paket.totalSession);
    }
  },
});


module.exports = {
  Paket
};
