const express = require("express");
const MapelService = require("../services/MapelService");
const { authMiddleware, authMiddlewareRole } = require("../../middleware");
const router = express.Router();

router.post("/mapel", authMiddlewareRole("admin"), async (req, res) => {
  try {
    const mapelData = req.body;
    const newMapel = await MapelService.createMapel(mapelData);
    res.status(201).json({
      message: "Mapel berhasil dibuat!",
      mapel: newMapel,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/mapel", authMiddleware, async (req, res) => {
  try {
    const mapelList = await MapelService.getAllMapel();
    res.status(200).json(mapelList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/mapel/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const mapel = await MapelService.getMapelById(id);
        res.status(200).json(mapel);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
});

router.get("/mapel/name/:name", authMiddleware, async (req, res) => {
    try{
        const {name} = req.params;
        const mapel = await MapelService.getMapelByName(name);
        res.status(200).json(mapel);
    }
    catch(error){
        res.status(404).json({ message: error.message });
    }
});

router.put("/mapel/:id", authMiddlewareRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const updatedMapel = await MapelService.updateMapel(id, updatedData);
        res.status(200).json({
        message: "Mapel berhasil diperbarui!",
        mapel: updatedMapel,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    }
);

router.delete("/mapel/:id", authMiddlewareRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMapel = await MapelService.deleteMapel(id);
        res.status(200).json({
        message: "Mapel berhasil dihapus!",
        mapel: deletedMapel,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
