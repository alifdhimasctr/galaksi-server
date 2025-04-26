const express = require('express');
const authService = require('../services/AuthService');
const { authMiddleware } = require('../../middleware');
const upload = require('../../helper/upload');
const { Tentor } = require('../models');
const router = express.Router();


/*REGISTER*/
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

router.post('/register/tentor',
  upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'sim',  maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.foto || !req.files?.sim) {
        return res.status(400).json({
          message: 'Foto dan SIM wajib di-upload.',
        });
      }
      const tentorData = {
        ...req.body,                                
        foto: req.files.foto[0].filename,
        sim : req.files.sim [0].filename,
      };

      const user = await authService.createTentor(tentorData);

      return res.status(201).json({
        message: 'Tentor berhasil terdaftar!',
        user,
      });
    } catch (error) {
      console.error('Register Tentor error:', error);
      const status = error.name === 'SequelizeValidationError' ? 400 : 500;
      return res.status(status).json({ message: error.message });
    }
  }
);

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


/*LOGIN*/
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

/*GET USER*/
router.get('/users/:role', authMiddleware ,async (req, res) => {
  try {
    const { role } = req.params;
    const users = await authService.getAllUsers(role);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


/*GET TENTOR*/
router.get('/tentor', async (req, res, next) => {
  try {
    const tentors = await Tentor.findAll();

    const host = `${req.protocol}://${req.get('host')}`;  
    const data = tentors.map(t => {
      const plain = t.toJSON();
      plain.fotoUrl = `${host}/uploads/tentor/${plain.foto}`;
      plain.simUrl  = `${host}/uploads/tentor/${plain.sim}`;
      delete plain.password;              
      return plain;
    });

    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
