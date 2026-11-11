const { validateTelemetry } = require("../utils/telemetryValidation");
const { processTelemetry } = require("../services/telemetryWorkerPool");
const telemetryService = require("../services/telemetryService");

const {
  publishTelemetry,
  publishBinaryTelemetry,
  publishGeofenceEvent,
} = require("../services/redisPubSub");

const {
  processGeofenceTelemetry,
} = require("../services/geofenceService");

function createTelemetryController(
  service = telemetryService,
  worker = processTelemetry,
  geofenceProcessor
) {
  // Use Geofence DB processing only with the production defaults.
  const processGeofence =
    geofenceProcessor ||
    (service === telemetryService && worker === processTelemetry
      ? processGeofenceTelemetry
      : async () => []);

  return {
    async createBinary(req, res, next) {
      try {
        const { data } = req.body;

        if (
          typeof data !== "string" ||
          !data ||
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)
        ) {
          return res.status(400).json({
            success: false,
            error: "Valid Base64 binary data is required",
          });
        }

        const buffer = Buffer.from(data, "base64");

        await publishBinaryTelemetry(buffer);

        return res.status(200).json({
          success: true,
          message: "Binary telemetry published",
          size: buffer.length,
        });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const validated = validateTelemetry(req.body);
        const processed = await worker(validated);
        const stored = await service.appendReading(processed);

        const telemetryPayload = {
          ...processed,
          timestamp: stored.timestamp,
        };

        // Publish normal telemetry.
        try {
          await publishTelemetry(telemetryPayload);
        } catch (error) {
          console.error("Telemetry publish failed:", error.message);
        }

        // Detect Geofence ENTER and EXIT events.
        try {
          const geofenceEvents = await processGeofence(telemetryPayload);

          for (const event of geofenceEvents) {
            try {
              await publishGeofenceEvent(event);
            } catch (error) {
              console.error(
                "Geofence event publish failed:",
                error.message
              );
            }
          }
        } catch (error) {
          console.error(
            "Geofence processing failed:",
            error.message
          );
        }

        return res.status(201).json({
          success: true,
          message: "Telemetry stored",
          telemetry: telemetryPayload,
        });
      } catch (error) {
        next(error);
      }
    },

    async list(req, res, next) {
      try {
        const {
          startTime,
          endTime,
          limit = "100",
          offset = "0",
        } = req.query;

        const readings = await service.getReadings(
          req.params.vehicleId,
          { startTime, endTime, limit, offset }
        );

        return res.status(200).json({
          success: true,
          vehicleId: req.params.vehicleId,
          count: readings.length,
          limit: Number(limit),
          offset: Number(offset),
          readings,
        });
      } catch (error) {
        next(error);
      }
    },

    async latest(req, res, next) {
      try {
        const reading = await service.getLatest(req.params.vehicleId);

        if (!reading) {
          return res.status(404).json({
            success: false,
            error: "No telemetry found for vehicle",
          });
        }

        return res.status(200).json({
          success: true,
          vehicleId: req.params.vehicleId,
          telemetry: reading,
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createTelemetryController };