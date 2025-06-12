// controllers/JadwalController.js
const express = require('express');
const router  = express.Router();
const JadwalService = require('../services/JadwalService');
const { authMiddleware } = require('../../middleware');  


router.put('/jadwal/present/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await JadwalService.presentJadwal(id);

      res.status(200).json({
        message : 'Jadwal berhasil ditandai hadir!',
        jadwal  : updated,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.put('/jadwal/reschedule/date/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newDate, newTime } = req.body;   

      if (!newDate || !newTime)
        return res.status(400).json({ message: 'newDate dan newTime wajib diisi' });

      const updated = await JadwalService.rescheduleJadwal(id, newDate, newTime);

      res.status(200).json({
        message : 'Jadwal berhasil dijadwalkan ulang (hari / jam).',
        jadwal  : updated,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.put('/jadwal/reschedule/tentor/:id',
  async (req, res) => {
    try {
      const { id } = req.params;

      const updated = await JadwalService.rescheduleTentor(id);

      res.status(200).json({
        message : 'Permintaan reschedule tentor berhasil dibuat.',
        jadwal  : updated,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.put('/jadwal/reschedule/tentor/approve/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newTentorId } = req.body;

      if (!newTentorId)
        return res.status(400).json({ message: 'newTentorId wajib diisi' });

      const updated = await JadwalService.approveRescheduleTentor(id, newTentorId);

      res.status(200).json({
        message : 'Reschedule tentor disetujui & jadwal diperbarui.',
        jadwal  : updated,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.put('/jadwal/reschedule/tentor/reject/:id',
    async (req, res) => {
        try {
        const { id } = req.params;
    
        const updated = await JadwalService.rejectRescheduleTentor(id);
    
        res.status(200).json({
            message : 'Permintaan reschedule tentor ditolak.',
            jadwal  : updated,
        });
        } catch (err) {
        res.status(400).json({ message: err.message });
        }
    }
)

router.get('/jadwal/invoice/:id',
    async (req, res) => {
      try {
        const { id } = req.params;
        const jadwal = await JadwalService.getJadwalByInvoiceId(id);
        res.status(200).json(jadwal);
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    }
  );

router.get('/jadwal/', authMiddleware, async (req, res) => {
  try {
    const { status } = req.params; // Get the status parameter from the query string
    const jadwal = await JadwalService.getAllJadwal(); // Pass the status to the service
    res.status(200).json(jadwal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/jadwal/:status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.params; // Get the status parameter from the query string
    const jadwal = await JadwalService.getAllJadwal(status); // Pass the status to the service
    res.status(200).json(jadwal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});



router.get('/jadwal/id/:id'
  , authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const jadwal = await JadwalService.getJadwalById(id);
      res.status(200).json(jadwal);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.get('/jadwal/tentor/:id'
  , authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const jadwal = await JadwalService.getJadwalByTentorId(id);
      res.status(200).json(jadwal);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.get('/jadwal/siswa/:id'
  , authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const jadwal = await JadwalService.getJadwalBySiswaId(id);
      res.status(200).json(jadwal);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);


module.exports = router;
