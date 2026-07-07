const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
} = require("../controllers/customerController");

const router = express.Router();

// All routes protected
router.use(protect);

// Get all customers
router.get("/", getCustomers);

// Search customer
router.get("/search", searchCustomers);

// Get single customer
router.get("/:id", getCustomer);

// Create customer
router.post("/", createCustomer);

// Update customer
router.put("/:id", updateCustomer);

// Delete customer
router.delete("/:id", deleteCustomer);

module.exports = router;