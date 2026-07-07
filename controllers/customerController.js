const pool = require("../config/db");

const getCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM customers ORDER BY id DESC"
    );

    res.json({
      success: true,
      customers: result.rows,
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load customers",
    });
  }
};

const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM customers WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("GET CUSTOMER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load customer",
    });
  }
};

const addCustomer = async (req, res) => {
  try {
    const { name, mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const exists = await pool.query(
      "SELECT id FROM customers WHERE mobile = $1",
      [mobile]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists",
      });
    }

    const result = await pool.query(
      `INSERT INTO customers (name, mobile)
       VALUES ($1, $2)
       RETURNING *`,
      [name || "", mobile]
    );

    res.status(201).json({
      success: true,
      message: "Customer added successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("ADD CUSTOMER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add customer",
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile } = req.body;

    const result = await pool.query(
      `UPDATE customers
       SET name = $1,
           mobile = $2
       WHERE id = $3
       RETURNING *`,
      [name, mobile, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM customers WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  addCustomer,
  updateCustomer,
  deleteCustomer,
};