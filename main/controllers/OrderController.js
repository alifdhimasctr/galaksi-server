const express = require("express");
const router = express.Router();
const OrderService = require("../services/OrderService");
const { authMiddleware, authMiddlewareRole } = require("../../middleware");

router.post("/order/:siswaId", async (req, res) => {
  try {
    const orderData = req.body;
    const { siswaId } = req.params;
    orderData.siswaId = siswaId;
    const newOrder = await OrderService.createOrder(orderData);
    res.status(201).json({
      message: "Order berhasil dibuat!",
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/order-by-admin", authMiddlewareRole("admin"), async (req, res) => {
  try {
    const orderData = req.body;
    const newOrder = await OrderService.createOrderByAdmin(orderData);
    res.status(201).json({
      message: "Order berhasil dibuat oleh admin!",
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/order/approve/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tentorId, meetingDay, time, mapel } = req.body || {};

    const adminEdits = {};

    if (tentorId) adminEdits.tentorId = tentorId;
    if (meetingDay) adminEdits.meetingDay = meetingDay;
    if (time) adminEdits.time = time;
    if (mapel) adminEdits.mapel = mapel;

    const updatedOrder = await OrderService.approveOrder(id, adminEdits);

    res.status(200).json({
      message: "Order berhasil di-approve!",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/order/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await OrderService.deleteOrder(id);
    res.status(200).json({
      message: "Order berhasil dihapus!",
      order: deletedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/order/reject/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await OrderService.rejectOrder(id);
    res.status(200).json({
      message: "Order berhasil di-reject!",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/order/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const orderData = req.body;
    const updatedOrder = await OrderService.updateOrder(id, orderData);
    res.status(200).json({
      message: "Order berhasil diperbarui!",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/order/:status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.params;
    const orders = await OrderService.getAllOrder(status);
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/order/siswa/:siswaId", authMiddleware, async (req, res) => {
  try {
    const { siswaId } = req.params;
    const orders = await OrderService.getOrderBySiswaId(siswaId);
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/order/id/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderById(id);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
