import Tenant from "../models/Tenant.js";
import Payment from "../models/Payment.js";

// GET /api/dashboard
export const getDashboard = async (req, res) => {
  try {
    // 1️⃣ Total Tenants
    const totalTenants = await Tenant.countDocuments();

    // 2️⃣ Total Payments Received
    const totalPaymentsAgg = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$paid_amount" } } },
    ]);
    const totalPayments = totalPaymentsAgg[0] ? totalPaymentsAgg[0].total : 0;

    // 3️⃣ Pending Payments (Due)
    const pendingPaymentsCount = await Payment.countDocuments({
      status: "due",
    });

    // 4️⃣ Recent Payments (Last 5)
    const recentPayments = await Payment.find()
      .sort({ payment_date: -1 })
      .limit(5)
      .populate("tenant_id", "name flat_no rent_amount");

    res.json({
      totalTenants,
      totalPayments,
      pendingPaymentsCount,
      recentPayments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
