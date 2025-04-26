const {Mapel} = require('../models');

const createMapel = async (mapelData) => {
    try {

        const {name} = mapelData;
        const existingMapel = await Mapel.findOne({
            where: {
                name: name,
            },
        });
        if (existingMapel) {
            throw new Error("Mapel sudah ada");
        }
        const newMapel = await Mapel.create(mapelData);
        return newMapel;
    } catch (error) {
        throw new Error(`Error saat membuat mapel: ${error.message}`);
    }
};

const getAllMapel = async () => {
    try {
        const mapelList = await Mapel.findAll();
        if (mapelList.length === 0) {
            throw new Error("Tidak ada mapel yang ditemukan");
        }
        return mapelList;
    } catch (error) {
        throw new Error(`${error.message}`);
    }
}

const getMapelById = async (id) => {
    try {
        const mapel = await Mapel.findOne({
            where: {
                id: id,
            },
        });
        if (!mapel) {
            throw new Error("Mapel tidak ditemukan");
        }
        return mapel;
    } catch (error) {
        throw new Error(`${error.message}`);
    }
};

const getMapelByName = async (name) => {
    try {
        const mapel = await Mapel.findOne({
            where: {
                name: name,
            },
        });
        if (!mapel) {
            throw new Error("Mapel tidak ditemukan");
        }
        return mapel;
    } catch (error) {
        throw new Error(`${error.message}`);
    }
}

const updateMapel = async (id, updatedData) => { 
    try {
        const mapel = await Mapel.findOne({
            where: {
                id: id,
            },
        });
        if (!mapel) {
            throw new Error("Mapel tidak ditemukan");
        }

        // Jika ada perubahan pada name, update id juga
        if (updatedData.name && updatedData.name !== mapel.name) {
            updatedData.id = updatedData.name.toLowerCase().replace(/\s+/g, '');
        }

        // Perbarui mapel
        await mapel.update(updatedData);
        return mapel;
    } catch (error) {
        throw new Error(`Error saat memperbarui mapel: ${error.message}`);
    }
};

const deleteMapel = async (id) => {
    try {
        const mapel = await Mapel.findOne({
            where: {
                id: id,
            },
        });
        if (!mapel) {
            throw new Error("Mapel tidak ditemukan");
        }
        
      
        await mapel.destroy();
        return { message: "Mapel berhasil dihapus" };
    } catch (error) {
        throw new Error(`Error saat menghapus mapel: ${error.message}`);
    }
};

module.exports = {
    createMapel,
    getAllMapel,
    getMapelById,
    getMapelByName,
    updateMapel,
    deleteMapel,
};
