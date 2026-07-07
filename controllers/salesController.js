const pool = require("../config/db");

const createSale = async (req, res) => {
  // Enterprise Architecture: Use a dedicated client for atomic database transactions
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Unify payload parameters (supports both legacy frontend and the new Billing.jsx payload)
    const {
      customer_id,
      customerName,
      customerMobile,
      items,
      subtotal,
      discount_percent,
      discountPercent,
      discountAmount,
      grand_total,
      grandTotal,
      payment_mode,
      paymentMode,
    } = req.body;

    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "No items in bill",
      });
    }

    // --- 1. RESOLVE CUSTOMER ---
    let finalCustomerId = customer_id || null;
    let finalCustomerName = customerName || "";
    let finalCustomerMobile = customerMobile || "";

    if (finalCustomerId) {
      // New Frontend: Fetch name and mobile using the provided customer_id
      const custCheck = await client.query("SELECT name, mobile FROM customers WHERE id = $1", [finalCustomerId]);
      if (custCheck.rows.length > 0) {
        finalCustomerName = custCheck.rows[0].name;
        finalCustomerMobile = custCheck.rows[0].mobile;
      }
    } else if (finalCustomerMobile) {
      // Legacy Frontend fallback: Find or create by mobile
      const custCheck = await client.query("SELECT * FROM customers WHERE mobile=$1", [finalCustomerMobile]);
      if (custCheck.rows.length > 0) {
        finalCustomerId = custCheck.rows[0].id;
        finalCustomerName = custCheck.rows[0].name;
      } else {
        const newCust = await client.query(
          "INSERT INTO customers(name, mobile) VALUES($1, $2) RETURNING *",
          [finalCustomerName, finalCustomerMobile]
        );
        finalCustomerId = newCust.rows[0].id;
      }
    }

    // --- 2. RESOLVE TOTALS ---
    const finalSubtotal = subtotal || 0;
    const finalDiscPercent = discount_percent !== undefined ? discount_percent : (discountPercent || 0);
    const finalDiscAmount = discountAmount !== undefined ? discountAmount : (finalSubtotal * finalDiscPercent / 100);
    const finalGrandTotal = grand_total !== undefined ? grand_total : (grandTotal || 0);
    const finalPaymentMode = payment_mode || paymentMode || "Cash";

    // --- 3. GENERATE BILL NUMBER ---
    const lastBill = await client.query("SELECT id FROM sales ORDER BY id DESC LIMIT 1");
    const nextNumber = lastBill.rows.length > 0 ? Number(lastBill.rows[0].id) + 1 : 1001;
    const billNo = `INV-${nextNumber}`;

    // --- 4. CREATE SALE RECORD ---
    const saleResult = await client.query(
      `INSERT INTO sales(
        bill_no, customer_id, customer_name, customer_mobile,
        subtotal, discount_percent, discount_amount, grand_total, payment_mode
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        billNo, finalCustomerId, finalCustomerName, finalCustomerMobile,
        finalSubtotal, finalDiscPercent, finalDiscAmount, finalGrandTotal, finalPaymentMode
      ]
    );

    const saleId = saleResult.rows[0].id;

    // --- 5. SAVE ITEMS & REDUCE STOCK ---
    for (const item of items) {
      // Fallbacks handle differences between legacy properties and new Billing.jsx properties
      const productId = item.product_id || item.id;
      const productName = item.product_name || item.name;
      const qty = item.qty || 1;
      const rate = item.rate || item.sale_price;
      const amount = item.amount || (qty * rate);

      await client.query(
        `INSERT INTO sale_items(sale_id, product_id, product_name, qty, rate, amount)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [saleId, productId, productName, qty, rate, amount]
      );

      // Reduce stock
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [qty, productId]
      );
    }

    // Commit the successful transaction
    await client.query('COMMIT');

    res.json({
      success: true,
      message: "Bill saved successfully",
      billNo,
      id: saleId, // Explicitly return ID for the frontend print preview window
      sale: saleResult.rows[0],
    });
  } catch (error) {
    // Rollback changes if anything fails
    await client.query('ROLLBACK');
    console.error("Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error during checkout",
    });
  } finally {
    // Always release the client back to the pool
    client.release();
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
        totalSales: totalSales.rows[0].total,
        totalBills: totalBills.rows[0].total,
        customers: customers.rows[0].total,
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