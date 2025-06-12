const express = require('express');
const { authMiddlewareRole } = require('../../middleware');
const TransactionService = require('../services/TransactionService');
const router = express.Router();

const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      throw new Error('Invalid period parameter');
  }
  return { startDate, endDate };
};

router.get('/transactions/income', authMiddlewareRole("admin"), async (req, res) => {
  try {
    const { period, start: startParam, end: endParam } = req.query;
    let startDate, endDate;

    if (period) {
      ({ startDate, endDate } = getDateRange(period));
    } else if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ message: 'Missing date parameters' });
    }

    const income = await TransactionService.getIncomeTransactions(startDate, endDate);
    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/transactions/expenses', authMiddlewareRole("admin"), async (req, res) => {
  try {
    const { period, start: startParam, end: endParam } = req.query;
    let startDate, endDate;

    if (period) {
      ({ startDate, endDate } = getDateRange(period));
    } else if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ message: 'Missing date parameters' });
    }

    const expenses = await TransactionService.getExpenseTransactions(startDate, endDate);
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/transactions/summary', authMiddlewareRole("admin"), async (req, res) => {
  try {
    const { period, start: startParam, end: endParam } = req.query;
    let startDate, endDate;

    if (period) {
      ({ startDate, endDate } = getDateRange(period));
    } else if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ message: 'Missing date parameters' });
    }

    const summary = await TransactionService.getTransactionSummary(startDate, endDate);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;