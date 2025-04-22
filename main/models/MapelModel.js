//MapelModel.js
const { DataTypes } = require('sequelize');
const db = require('../../database/db');

const Mapel = db.define(
  'Mapel',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
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
  },
  {
    hooks: {
      beforeValidate: async (mapel) => {
        if (!mapel.id && mapel.name) {
          mapel.id = mapel.name.toLowerCase().replace(/\s+/g, '');
        }

        const existing = await Mapel.findOne({ where: { name: mapel.name } });
        if (existing) throw new Error('Mapel with this name already exists');
      },
    },
  },
);

module.exports = { Mapel };
