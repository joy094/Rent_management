// controllers/tenantController.js
import Tenant from "../models/Tenant.js";
import Payment from "../models/Payment.js";

// GET /api/tenants
export const getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find();
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/tenants
export const addTenant = async (req, res) => {
  try {
    const { name, phone, flat_no, rent_amount } = req.body;

    if (!name || !flat_no || rent_amount === undefined) {
      return res.status(400).json({ message: "Name, Flat No, and Rent Amount required" });
    }

    if (rent_amount < 0) {
      return res.status(400).json({ message: "Rent Amount cannot be negative" });
    }

    const tenant = new Tenant({ name, phone, flat_no, rent_amount });
    const savedTenant = await tenant.save();
    res.status(201).json(savedTenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tenants/:id
export const getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    // Optional: populate payments
    // const payments = await Payment.find({ tenant_id: req.params.id });
    // res.json({ ...tenant.toObject(), payments });

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tenants/:id
export const updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true, // validation চালু রাখে
    });

    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/tenants/:id
export const deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    // Cascading delete: tenant এর সব payments ডিলিট করা
    await Payment.deleteMany({ tenant_id: req.params.id });

    res.json({ message: "Tenant and associated payments deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
