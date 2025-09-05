// controllers/paymentController.js
import Payment from "../models/Payment.js";
import Tenant from "../models/Tenant.js";

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

// GET /api/payments?month=YYYY-MM
export const getPayments = async (req, res) => {
  try {
    const { month } = req.query;

    if (month && !monthRegex.test(month)) {
      return res.status(400).json({ message: "Invalid month format (YYYY-MM)" });
    }

    const filter = month ? { month } : {};
    const payments = await Payment.find(filter).populate(
      "tenant_id",
      "name flat_no rent_amount"
    );

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payments/:tenantId?month=YYYY-MM
export const getPaymentsByTenant = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = { tenant_id: req.params.tenantId };

    if (month) {
      if (!monthRegex.test(month)) {
        return res.status(400).json({ message: "Invalid month format (YYYY-MM)" });
      }
      filter.month = month;
    }

    const payments = await Payment.find(filter).populate(
      "tenant_id",
      "name flat_no rent_amount"
    );

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/payments
export const addPayment = async (req, res) => {
  try {
    const { tenant_id, month, paid_amount = 0, payment_date = new Date() } = req.body;

    if (!tenant_id || !month) {
      return res.status(400).json({ message: "Tenant and Month are required" });
    }

    if (!monthRegex.test(month)) {
      return res.status(400).json({ message: "Invalid month format (YYYY-MM)" });
    }

    if (paid_amount < 0) {
      return res.status(400).json({ message: "Paid amount cannot be negative" });
    }

    const tenantExists = await Tenant.findById(tenant_id);
    if (!tenantExists) return res.status(404).json({ message: "Tenant not found" });

    const payment = new Payment({ tenant_id, month, paid_amount, payment_date });

    try {
      const savedPayment = await payment.save();
      await savedPayment.populate("tenant_id", "name flat_no rent_amount");
      res.status(201).json(savedPayment);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "Payment for this tenant and month already exists" });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/payments/:id
export const updatePayment = async (req, res) => {
  try {
    const { month, paid_amount } = req.body;

    if (month && !monthRegex.test(month)) {
      return res.status(400).json({ message: "Invalid month format (YYYY-MM)" });
    }

    if (paid_amount !== undefined && paid_amount < 0) {
      return res.status(400).json({ message: "Paid amount cannot be negative" });
    }

    try {
      const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .populate("tenant_id", "name flat_no rent_amount");

      if (!payment) return res.status(404).json({ message: "Payment not found" });

      res.json(payment);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "Payment for this tenant and month already exists" });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/payments/:id
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
