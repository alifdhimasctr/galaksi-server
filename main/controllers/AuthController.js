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
    { name: 'sim',  maxCount: 1 },
    { name: 'ktp',  maxCount: 1 },
    { name: 'cv',   maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.foto || !req.files?.sim || !req.files?.ktp || !req.files?.cv) {
        return res.status(400).json({
          message: 'Foto, SIM, KTP, dan CV wajib di-upload.',
        });
      }
      const tentorData = {
        ...req.body,
        foto: req.files.foto[0].filename,
        sim : req.files.sim[0].filename,
        ktp : req.files.ktp[0].filename,
        cv  : req.files.cv[0].filename,
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
router.get('/users/:role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.params;
    const { mitraId } = req.query; // Ambil parameter mitraId dari query string
    
    // Siapkan filter object
    const filters = {};
    if (mitraId) {
      filters.mitraId = mitraId;
    }

    const users = await authService.getAllUsers(role, filters);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/*GET USER BY ID*/
router.get('/users/:role/:id', async (req, res) => {
  try {
    const { role, id } = req.params;
    const user = await authService.getUserById(id, role);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/tentor/level/:level', async (req, res, next) => {
  try {
    const { level } = req.params;
    const host = `${req.protocol}://${req.get('host')}`;

    if (!level) {
      return res.status(400).json({ message: 'Level parameter is required' });
    }

    const tentors = await authService.getAllTentor(level, host);
    res.json(tentors);
  } catch (error) {
    next(error);
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
      plain.ktpUrl  = `${host}/uploads/tentor/${plain.ktp}`;
      plain.cvUrl   = `${host}/uploads/tentor/${plain.cv}`;
      delete plain.password;              
      return plain;
    });

    res.json(data);
  } catch (err) { next(err); }
});

/*UPDATE DATA*/
router.put('/users/:role/:id', async (req, res) => {
  try {
    const { role, id } = req.params;
    const userData = req.body;

    const updatedUser = await authService.updateUser(id, userData,role);

    res.status(200).json({
      message: 'User berhasil diperbarui!',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
} );

router.put('/tentor/:id', upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'sim', maxCount: 1 },
  { name: 'ktp', maxCount: 1 },
  { name: 'cv', maxCount: 1 }
]), 
async (req, res) => {
  try {
    const { id } = req.params; // Get the tentor id from the URL
    const tentorData = {
      ...req.body,
      foto: req.files?.foto ? req.files.foto[0].filename : undefined, // Only update if a new foto is uploaded
      sim: req.files?.sim ? req.files.sim[0].filename : undefined, // Only update if a new sim is uploaded
      ktp: req.files?.ktp ? req.files.ktp[0].filename : undefined, // Only update if a new ktp is uploaded
      cv: req.files?.cv ? req.files.cv[0].filename : undefined, //
    };

    // Call the updateTentor service function
    const updatedTentor = await authService.updateTentor(id, tentorData);

    return res.status(200).json({
      message: 'Tentor berhasil diperbarui!',
      user: updatedTentor,
    });
  } catch (error) {
    console.error('Update Tentor error:', error);
    const status = error.name === 'SequelizeValidationError' ? 400 : 500;
    return res.status(status).json({ message: error.message });
  }
}
);

/*DELETE USER*/
router.delete('/users/:role/:id', async (req, res) => {
  try {
    const { role, id } = req.params;

    await authService.deleteUser(id, role);

    res.status(200).json({
      message: 'User berhasil dihapus!',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
