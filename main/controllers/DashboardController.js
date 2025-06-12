const express = require('express');
const router = express.Router();
const { getADminDashboard } = require('../services/DashboardService');


router.get('/dashboard/admin', async (req, res) => {
    try {
        const dashboardData = await getADminDashboard();
        res.status(200).json(dashboardData);
    }
     catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});

module.exports = router;