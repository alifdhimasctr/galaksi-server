const express = require('express');
const PaketService = require('../services/PaketService');  
const { authMiddlewareRole, authMiddleware } = require('../../middleware');
const router = express.Router();

router.post('/paket', authMiddlewareRole("admin"), async (req, res) => {
  try {
    const paketData = req.body;
    const newPaket = await PaketService.createPaket(paketData);
    res.status(201).json({
      message: 'Paket berhasil dibuat!',
      paket: newPaket,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/paket/multiple', authMiddlewareRole("admin"), async (req, res) => {
  try {
    const paketDataArray = req.body; // menerima array dari body request
    const newPaket = await PaketService.createPaketMultiple(paketDataArray);
    res.status(201).json({
      message: 'Paket berhasil dibuat!',
      paket: newPaket,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/paket', async (req, res) => {
  try {
    const paketList = await PaketService.getAllPaket();
    res.status(200).json(paketList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/paket/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const paket = await PaketService.getPaketById(id);
    res.status(200).json(paket);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.get('/paket/level-category/:level/:category', async (req, res) => {
  const { level, category } = req.params;
  try {
    const paketList = await PaketService.getPaketByLevelCategory(level,category);
    res.status(200).json(paketList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/paket/level/:level', async (req, res) => {
  const { level } = req.params;
  try {
    const paketList = await PaketService.getPaketByLevel(level);
    res.status(200).json(paketList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/paket/:id', authMiddlewareRole("admin"), async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    const updatedPaket = await PaketService.updatePaket(id, updatedData);
    res.status(200).json({
      message: 'Paket berhasil diperbarui!',
      paket: updatedPaket,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/paket/:id', authMiddlewareRole("admin"), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await PaketService.deletePaket(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
