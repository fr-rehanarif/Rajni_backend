const express = require("express");
const protect = require("../middleware/authMiddleware");
const { 
  getCustomers, 
  getCustomer, 
  addCustomer, 
  updateCustomer, 
  deleteCustomer, 
  getCustomerByMobile 
} = require("../controllers/customerController");

const router = express.Router();

// Define routes
router.get("/", protect, getCustomers);
router.post("/", protect, addCustomer);

// IMPORTANT: mobile route must be above /:id to prevent conflict
router.get("/mobile/:mobile", protect, getCustomerByMobile);

router.get("/:id", protect, getCustomer);
router.put("/:id", protect, updateCustomer);
router.delete("/:id", protect, deleteCustomer);

module.exports = router;