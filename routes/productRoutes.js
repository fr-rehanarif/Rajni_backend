const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  searchProducts, // 1. Imported the new search controller
} = require("../controllers/productController");

const router = express.Router();

// 2. IMPORTANT: /search MUST be registered before /:id to prevent routing conflicts
router.get("/search", protect, searchProducts);

router.post("/", protect, addProduct);
router.get("/", protect, getProducts);

router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);

module.exports = router;