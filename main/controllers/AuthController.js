const express = require('express');
const authService = require('../services/AuthService');
const { authMiddleware } = require('../../middleware');
const router = express.Router();

router.post('/register/siswa', async (req, res) => {
  try {
    const siswaData = req.body;

    const user = await authService.createSiswa(siswaData);
    res.status(201).json({
      message: 'Siswa berhasil terdaftar!',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post('/register/tentor', async (req, res) => {
  try {
    const tentorData = req.body;
    const user = await authService.createTentor(tentorData);

    res.status(201).json({
      message: 'Tentor berhasil terdaftar!',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register/mitra', async (req, res) => {
  try {
    const mitraData = req.body;

    

    const user = await authService.createMitra(mitraData);

    res.status(201).json({
      message: 'Mitra berhasil terdaftar!',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register/admin', async (req, res) => {
  try {
    const adminData = req.body;

    const user = await authService.createAdmin(adminData);

    res.status(201).json({
      message: 'Admin berhasil terdaftar!',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const { token, user } = await authService.login(username, password, role);

    res.status(200).json({
      message: 'Login berhasil!',
      token,
      user
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

router.get('/users/:role', authMiddleware ,async (req, res) => {
  try {
    const { role } = req.params;
    const users = await authService.getAllUsers(role);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
