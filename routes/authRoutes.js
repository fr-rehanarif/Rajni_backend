const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  registerAdmin,
  loginAdmin,
  getAdmins,
  changePassword,
  deleteAdmin,
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", loginAdmin);

router.post("/register", protect, registerAdmin);

router.get("/admins", protect, getAdmins);

router.put("/change-password", protect, changePassword);

router.delete("/admins/:id", protect, deleteAdmin);

module.exports = router;