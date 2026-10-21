const express = require("express");
const { createTelemetryController } = require("../controllers/telemetryController");

function telemetryRoutes(dependencies) {
  const router = express.Router();
  const controller = createTelemetryController(dependencies.telemetryService, dependencies.worker);
  router.post("/", controller.create);
  router.get("/:vehicleId/latest", controller.latest);
  router.get("/:vehicleId", controller.list);
  return router;
}

module.exports = telemetryRoutes;
