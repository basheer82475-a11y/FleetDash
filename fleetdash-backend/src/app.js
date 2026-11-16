const express = require("express");
const cors = require("cors");

const telemetryRoutes = require("./routes/telemetryRoutes");
const geofenceRoutes = require("./routes/geofenceRoutes");

const {
  notFound,
  errorHandler,
} = require("./middleware/errorHandler");

const requestLogger = require("./middleware/requestLogger");

function createApp({ telemetryService, worker } = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "32kb" }));

  app.use(requestLogger);

  app.get("/", (req, res) =>
    res.json({
      success: true,
      message: "FleetDash Backend Running Successfully",
    })
  );

  app.get("/api/health", (req, res) =>
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    })
  );

  app.use(
    "/api/telemetry",
    telemetryRoutes({ telemetryService, worker })
  );

  app.use("/api/geofences", geofenceRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;