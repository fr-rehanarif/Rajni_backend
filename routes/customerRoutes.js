const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  getCustomers,
  getCustomer,
  addCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.use(protect);

router.get("/", getCustomers);

router.get("/:id", getCustomer);

router.post("/", addCustomer);

router.put("/:id", updateCustomer);

router.delete("/:id", deleteCustomer);

module.exports = router;