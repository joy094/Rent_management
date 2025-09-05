import express from "express";
import {
  getPayments,
  getPaymentsByTenant,
  addPayment,
  updatePayment,
  deletePayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.route("/")
  .get(getPayments)
  .post(addPayment);

router.route("/:id")
  .put(updatePayment)
  .delete(deletePayment);

router.route("/tenant/:tenantId")
  .get(getPaymentsByTenant);

export default router;
