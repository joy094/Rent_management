//models/Tenant.js

import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  flat_no: {
    type: String,
    required: true,
  },
  rent_amount: {
    type: Number,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Tenant", tenantSchema);
