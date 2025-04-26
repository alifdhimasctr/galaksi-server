//MapelModel.js
const { DataTypes, UUIDV4 } = require('sequelize');
const db = require('../../database/db');

const Mapel = db.define(
  'Mapel',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }
);

// Mapel.sync({ force: true })
//   .then(() => {
//     console.log('Mapel table created');
//   })
//   .catch((error) => {
//     console.error('Error creating Mapel table:', error);
//   }); 

module.exports = { Mapel };
