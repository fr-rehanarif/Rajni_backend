const pool = require("../config/db");

const createSale = async (req, res) => {
  try {
    const {
      customerName,
      customerMobile,
      items,
      subtotal,
      discountPercent,
      discountAmount,
      grandTotal,
      paymentMode,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items in bill",
      });
    }

    // Find customer
    let customerId = null;

    const customerCheck = await pool.query(
      "SELECT * FROM customers WHERE mobile=$1",
      [customerMobile]
    );

    if (customerCheck.rows.length > 0) {
      customerId = customerCheck.rows[0].id;
    } else {
      const newCustomer = await pool.query(
        `
        INSERT INTO customers(name,mobile)
        VALUES($1,$2)
        RETURNING *
        `,
        [customerName, customerMobile]
      );

      customerId = newCustomer.rows[0].id;
    }

    // Generate bill number
    const lastBill = await pool.query(`
      SELECT id FROM sales
      ORDER BY id DESC
      LIMIT 1
    `);

    const nextNumber =
      lastBill.rows.length > 0
        ? Number(lastBill.rows[0].id) + 1
        : 1001;

    const billNo = `INV-${nextNumber}`;

    // Create Sale
    const saleResult = await pool.query(
      `
      INSERT INTO sales(
        bill_no,
        customer_id,
        customer_name,
        customer_mobile,
        subtotal,
        discount_percent,
        discount_amount,
        grand_total,
        payment_mode
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        billNo,
        customerId,
        customerName,
        customerMobile,
        subtotal,
        discountPercent,
        discountAmount,
        grandTotal,
        paymentMode,
      ]
    );

    const saleId = saleResult.rows[0].id;

    // Save Sale Items
    for (const item of items) {
      await pool.query(
        `
        INSERT INTO sale_items(
          sale_id,
          product_id,
          product_name,
          qty,
          rate,
          amount
        )
        VALUES($1,$2,$3,$4,$5,$6)
        `,
        [
          saleId,
          item.id,
          item.name,
          item.qty,
          item.sale_price,
          item.qty * item.sale_price,
        ]
      );

      // Reduce stock
      await pool.query(
        `
        UPDATE products
        SET stock = stock - $1
        WHERE id = $2
        `,
        [item.qty, item.id]
      );
    }

    res.json({
      success: true,
      message: "Bill saved successfully",
      billNo,
      sale: saleResult.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getSales = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM sales
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      sales: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    const items = await pool.query(
      `SELECT * FROM sale_items WHERE sale_id=$1`,
      [id]
    );

    for (const item of items.rows) {
      await pool.query(
        `
        UPDATE products
        SET stock = stock + $1
        WHERE id = $2
        `,
        [item.qty, item.product_id]
      );
    }

    await pool.query(
      `DELETE FROM sale_items WHERE sale_id=$1`,
      [id]
    );

    await pool.query(
      `DELETE FROM sales WHERE id=$1`,
      [id]
    );

    res.json({
      success: true,
      message: "Bill deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
const getDashboardStats = async (req, res) => {
  try {
    const totalSales = await pool.query(`
      SELECT COALESCE(SUM(grand_total),0) total
      FROM sales
    `);

    const totalBills = await pool.query(`
      SELECT COUNT(*) total
      FROM sales
    `);

    const customers = await pool.query(`
      SELECT COUNT(*) total
      FROM customers
    `);

    res.json({
      success: true,
      stats: {
        totalSales:
          totalSales.rows[0].total,
        totalBills:
          totalBills.rows[0].total,
        customers:
          customers.rows[0].total,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
    });
  }
};

const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await pool.query(
      `
      SELECT *
      FROM sales
      WHERE id=$1
      `,
      [id]
    );

    const items = await pool.query(
      `
      SELECT *
      FROM sale_items
      WHERE sale_id=$1
      `,
      [id]
    );

    res.json({
      success: true,
      sale: sale.rows[0],
      items: items.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  deleteSale,
  getDashboardStats,
};