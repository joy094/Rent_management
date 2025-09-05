import express from "express";
import {
  getTenants,
  addTenant,
  getTenantById,
  updateTenant,
  deleteTenant,
} from "../controllers/tenantController.js";

const router = express.Router();

router.route("/")
  .get(getTenants)
  .post(addTenant);

router.route("/:id")
  .get(getTenantById)
  .put(updateTenant)
  .delete(deleteTenant);

export default router;
