const express = require('express');
const router = express.Router();
const InvoiceService = require('../services/InvoiceService');
const { authMiddleware } = require('../../middleware'); 

router.get(
  '/invoice',

  async (req, res) => {
    try {
      const invoices = await InvoiceService.getAllInvoices();
      res.status(200).json(invoices);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);



module.exports = router;