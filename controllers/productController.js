const pool = require("../config/db");

const addProduct = async (req, res) => {
  try {
    const { name, category, stock, purchase_price, selling_price } = req.body;

    const result = await pool.query(
      `INSERT INTO products 
      (name, category, stock, purchase_price, selling_price) 
      VALUES ($1,$2,$3,$4,$5) 
      RETURNING *`,
      [name, category, stock, purchase_price, selling_price]
    );

    res.status(201).json({
      success: true,
      product: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY id DESC"
    );

    res.json({
      success: true,
      products: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, stock, purchase_price, selling_price } = req.body;

    const result = await pool.query(
      `UPDATE products 
       SET 
       name=$1, 
       category=$2, 
       stock=$3, 
       purchase_price=$4, 
       selling_price=$5 
       WHERE id=$6 
       RETURNING *`,
      [name, category, stock, purchase_price, selling_price, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM products WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Enterprise Search Function for POS
const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const searchQuery = `%${q}%`;
    
    // We use AS to map your existing columns to what Billing.jsx expects
    // without requiring you to change your database schema.
    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        category, 
        stock,
        id::text AS code, 
        selling_price AS sale_price, 
        selling_price AS mrp, 
        0 AS gst 
       FROM products 
       WHERE name ILIKE $1 OR category ILIKE $1 
       LIMIT 15`,
      [searchQuery]
    );

    // Frontend expects an array directly for search results
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
};