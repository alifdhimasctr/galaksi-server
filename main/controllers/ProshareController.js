const express = require('express');
const router = express.Router();
const ProshareService = require('../services/ProshareService');
const { authMiddleware } = require('../../middleware');
const fs = require('fs');
const path = require('path');

router.get('/proshare', authMiddleware, async (req, res) => {
  try {
    const { mitraId } = req.query;
    const filters = {};
    if  (mitraId) {
      filters.mitraId = mitraId;
    }
    const proshares = await ProshareService.getAllProshares(filters);
    res.status(200).json(proshares);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/proshare/id/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const proshareDetails = await ProshareService.getProshareDetails(id);
    res.status(200).json(proshareDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/proshare/pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Generate PDF
    const filePath = await ProshareService.generateProsharePdf(id);

    // Set header untuk response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=proshare-${id}.pdf`);

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