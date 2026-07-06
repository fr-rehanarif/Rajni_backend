const express = require("express");

const {
  createSale,
  getSales,
  getSaleById,
  deleteSale,
  getDashboardStats,
} = require("../controllers/salesController");;

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create Bill
router.post(
  "/",
  authMiddleware,
  createSale
);

// Bill History
router.get(
  "/",
  authMiddleware,
  getSales
);

// Single Bill
router.get(
  "/:id",
  authMiddleware,
  getSaleById
);

// Delete Bill
router.delete(
  "/:id",
  authMiddleware,
  deleteSale
);

// Dashboard Stats
router.get(
  "/dashboard",
  authMiddleware,
  getDashboardStats
);

module.exports = router;