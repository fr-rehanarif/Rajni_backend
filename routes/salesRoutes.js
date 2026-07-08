const express = require("express");
const pool = require("../config/db");
const {
  createSale,
  getSales,
  getSaleById,
  deleteSale,
  getDashboardStats,
} = require("../controllers/salesController");;

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/customer/:mobile", authMiddleware, async (req, res) => {
  try {
    const { mobile } = req.params;

    const result = await pool.query(
      "SELECT * FROM customers WHERE mobile = $1",
      [mobile]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        customer: null,
      });
    }

    res.json({
      success: true,
      customer: result.rows[0],
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

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