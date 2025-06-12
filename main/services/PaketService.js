const { Paket } = require('../models');
const { Op } = require('sequelize');

const createPaket = async (paketData) => {
  try {
    const newPaket = await Paket.create(paketData);
    return newPaket;
  } catch (error) {
    throw new Error(`Error saat membuat paket: ${error.message}`);
  }
};

const createPaketMultiple = async (paketDataArray) => {
  try {
    const newPaket = await Paket.bulkCreate(paketDataArray);
    return newPaket;
  } catch (error) {
    throw new Error(`Error saat membuat paket: ${error.message}`);
  }
};


const getAllPaket = async () => {
  try {
    const paketList = await Paket.findAll({
      where: {
        status: 'Aktif',  
      },
    });
    if (paketList.length === 0) {
      throw new Error("Tidak ada paket yang ditemukan");
    }
    return paketList;
    
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

const getPaketByLevelCategory = async (level, category) => {
  try {
    const orConditions = [
      { level: level },
      { level: null }
    ];
    if (level === 'SMA') {
      orConditions.push({ level: 'SNBT' });
    }
    
    const paketList = await Paket.findAll({
      where: {
        [Op.or]: orConditions,
        status: 'Aktif',
        category: category,
      },
    });
    
    return paketList;
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

const getPaketByLevel = async (level) => {
  try {
    const orConditions = [
      { level: level },
      { level: null }
    ];
    if (level === 'SMA') {
      orConditions.push({ level: 'SNBT' });
    }
    
    const paketList = await Paket.findAll({
      where: {
        [Op.or]: orConditions,
        status: 'Aktif',
      },
    });
    
    return paketList;
  } catch (error) {
    throw new Error(`${error.message}`);
  }
}

const getPaketById = async (id) => {
  try {
    const paket = await Paket.findOne({
      where: {
        id: id,
      },
    });
    if (!paket) {
      throw new Error("Paket tidak ditemukan");
    }
    return paket;
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};



const updatePaket = async (id, updatedData) => {
  try {
    const paket = await Paket.findOne({
      where: {
        id: id,
      },
    });
    if (!paket) {
      throw new Error("Paket tidak ditemukan");
    }
    
    await paket.update(updatedData);
    return paket;
  } catch (error) {
    throw new Error(`Error saat memperbarui paket: ${error.message}`);
  }
};

const deletePaket = async (id) => {
  try {
    const paket = await Paket.findOne({
      where: {
        id: id,
      },
    });
    if (!paket) {
      throw new Error("Paket tidak ditemukan");
    }
    
    await paket.destroy();
    return { message: "Paket berhasil dihapus" };
  } catch (error) {
    throw new Error(`Error saat menghapus paket: ${error.message}`);
  }
};

module.exports = {
  createPaket,
  createPaketMultiple,
  getAllPaket,
  getPaketById,
  getPaketByLevelCategory,
  getPaketByLevel,
  updatePaket,
  deletePaket,
};
