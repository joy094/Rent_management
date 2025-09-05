// models/Payment.js
import mongoose from "mongoose";

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const paymentSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    month: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return monthRegex.test(v);
        },
        message: (props) => `${props.value} is not a valid month format (YYYY-MM)`,
      },
    },
    paid_amount: {
      type: Number,
      required: true,
      min: [0, "Paid amount cannot be negative"],
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index: একই tenant একই মাসে একবারই পেমেন্ট করতে পারবে
paymentSchema.index({ tenant_id: 1, month: 1 }, { unique: true });

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
