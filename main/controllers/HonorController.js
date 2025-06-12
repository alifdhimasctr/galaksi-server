const express = require('express');
const router = express.Router();
const HonorService = require('../services/HonorService');
const { authMiddleware } = require('../../middleware'); 
const fs = require('fs');
const path = require('path');

router.get('/honor', authMiddleware, async (req, res) => {
  try {
    const {tentorId} = req.query;
    const filters = {};
    if (tentorId) {
      filters.tentorId = tentorId;
    }
    const honors = await HonorService.getAllHonor(filters);
    res.status(200).json(honors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/honor/id/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const honorDetails = await HonorService.getHonorDetails(id);
    res.status(200).json(honorDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/honor/pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Generate PDF
    const filePath = await HonorService.generateHonorPdf(id);

    // Set header untuk response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=honor-${id}.pdf`);

    // Read the PDF file and send it in the response
    const pdfStream = fs.createReadStream(filePath);
    pdfStream.pipe(res).on('finish', () => {
      // Delete the file after sending it
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




module.exports = router;