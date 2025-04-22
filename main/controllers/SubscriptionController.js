const express = require('express');
const router = express.Router();
const SubscriptionService = require('../services/SubscriptionService');
const { authMiddleware } = require('../../middleware'); 


router.get(
  '/subscription',
  async (req, res) => {
    try {
      const subscriptions = await SubscriptionService.getAllSubscriptions();
      res.status(200).json(subscriptions);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.get(
  '/subscription/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const subscription = await SubscriptionService.getSubscriptionById(id);
      res.status(200).json(subscription);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);


module.exports = router;