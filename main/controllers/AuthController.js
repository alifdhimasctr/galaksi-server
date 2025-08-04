const express = require('express');
const authService = require('../services/AuthService');
const { authMiddleware } = require('../../middleware');

const cloudina = require('../services/cloudinaryService');
const { Tentor } = require('../models');
const { uploadMiddleware, handleCloudinaryUploadSingle, handleCloudinaryUploadMultiple } = require('../../helper/upload');
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

//contoh upload file
router.post('/upload',
  uploadMiddleware.fields([{ name: 'file', maxCount: 2 }]),
  handleCloudinaryUploadMultiple,
  (req, res) => {
    res.status(200).json({
      message: 'File uploaded successfully!',
      files: req.files.file.map(file => ({
        originalname: file.originalname,
        cloudinaryUrl: file.cloudinaryUrl,
        publicId: file.publicId,
        cloudinarySize: file.cloudinarySize
      }))
    });
  }
)

router.post('/register/tentor',
  uploadMiddleware.fields([ // Menggunakan uploadMiddleware baru
    { name: 'foto', maxCount: 1 },
    { name: 'sim',  maxCount: 1 },
    { name: 'ktp',  maxCount: 1 },
    { name: 'cv',   maxCount: 1 }
  ]),
  handleCloudinaryUploadMultiple, // Middleware untuk upload ke Cloudinary
  async (req, res) => {
    try {
      // Validasi file
      if (!req.files?.foto || !req.files?.sim || !req.files?.ktp || !req.files?.cv) {
        return res.status(400).json({
          message: 'Foto, SIM, KTP, dan CV wajib di-upload.',
        });
      }
      const tentorData = {
        ...req.body,
        foto: req.files.foto[0].cloudinaryUrl,
        sim : req.files.sim[0].cloudinaryUrl,
        ktp : req.files.ktp[0].cloudinaryUrl,
        cv  : req.files.cv[0].cloudinaryUrl,
      };

      const user = await authService.createTentor(tentorData);

      return res.status(201).json({
        message: 'Tentor berhasil terdaftar!',
        user,
      });
    } catch (error) {
      console.error('Register Tentor error:', error);
      const status = error.name === 'SequelizeValidationError' ? 400 : 500;
      return res.status(status).json({ 
        message: error.message,
        details: error.errors?.map(e => e.message) // Tambahkan detail error jika ada
      });
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
      
      // Gunakan endpoint baru untuk mengakses file
      if (plain.foto) plain.fotoUrl = `${host}/api/files/${plain.foto}`;
      if (plain.sim) plain.simUrl = `${host}/api/files/${plain.sim}`;
      if (plain.ktp) plain.ktpUrl = `${host}/api/files/${plain.ktp}`;
      if (plain.cv) plain.cvUrl = `${host}/api/files/${plain.cv}`;
      
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

router.put('/tentor/:id', 
  uploadMiddleware.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'sim', maxCount: 1 },
    { name: 'ktp', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
  ]), 
  handleCloudinaryUploadMultiple, // Middleware untuk upload ke Cloudinary
  async (req, res) => {
    try {
      const { id } = req.params;
      const tentorData = { ...req.body };

      // Dapatkan data tentor lama untuk menghapus file lama jika ada
      const existingTentor = await authService.getUserById(id, 'tentor');
      const filesToDelete = [];

      // Jika ada file baru diupload, tandai file lama untuk dihapus
      if (req.files) {
        if (req.files.foto) {
          tentorData.foto = req.files.foto[0].driveFileId;
          if (existingTentor.foto) filesToDelete.push(existingTentor.foto);
        }
        if (req.files.sim) {
          tentorData.sim = req.files.sim[0].driveFileId;
          if (existingTentor.sim) filesToDelete.push(existingTentor.sim);
        }
        if (req.files.ktp) {
          tentorData.ktp = req.files.ktp[0].driveFileId;
          if (existingTentor.ktp) filesToDelete.push(existingTentor.ktp);
        }
        if (req.files.cv) {
          tentorData.cv = req.files.cv[0].driveFileId;
          if (existingTentor.cv) filesToDelete.push(existingTentor.cv);
        }
      }

      // Update data tentor
      const updatedTentor = await authService.updateTentor(id, tentorData);

      if (filesToDelete.length > 0) {
        filesToDelete.forEach(async (fileId) => {
          try {
            await cloudina.deleteFile(fileId);
          } catch (error) {
            console.error(`Failed to delete old file ${fileId}:`, error);
            // Log error tapi jangan gagalkan update
          }
        });
      }

      return res.status(200).json({
        message: 'Tentor berhasil diperbarui!',
        user: updatedTentor,
      });
    } catch (error) {
      console.error('Update Tentor error:', error);
      const status = error.name === 'SequelizeValidationError' ? 400 : 500;
      return res.status(status).json({ 
        message: error.message,
        details: error.errors?.map(e => e.message)
      });
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
