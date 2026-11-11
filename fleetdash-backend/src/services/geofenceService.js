const booleanPointInPolygon = require("@turf/boolean-point-in-polygon")
  .default;
const { point } = require("@turf/helpers");

const Geofence = require("../models/Geofence");
const GeofenceVehicleState = require("../models/GeofenceVehicleState");

async function processGeofenceTelemetry(telemetry) {
  const { vehicleId, latitude, longitude, timestamp } = telemetry;

  const vehiclePoint = point([longitude, latitude]);

  const geofences = await Geofence.find({ isActive: true }).lean();
  const events = [];

  for (const geofence of geofences) {
    const isInside = booleanPointInPolygon(
      vehiclePoint,
      geofence.coordinates
    );

    const previousState = await GeofenceVehicleState.findOne({
      vehicleId,
      geofenceId: geofence._id,
    });

    // First location received for this vehicle and geofence
    if (!previousState) {
      try {
        await GeofenceVehicleState.create({
          vehicleId,
          geofenceId: geofence._id,
          isInside,
        });

        if (isInside) {
          events.push({
            eventType: "ENTER",
            vehicleId,
            geofenceId: geofence._id,
            geofenceName: geofence.name,
            latitude,
            longitude,
            timestamp,
          });
        }
      } catch (error) {
        // Another request may have created this state simultaneously.
        if (error.code !== 11000) throw error;
      }

      continue;
    }

    // No change: don't generate a repeated alert.
    if (previousState.isInside === isInside) continue;

    // Update only if the state is still what we previously read.
    const updatedState = await GeofenceVehicleState.findOneAndUpdate(
      {
        _id: previousState._id,
        isInside: previousState.isInside,
      },
      { $set: { isInside } },
      { new: true }
    );

    // Another request may have updated it first.
    if (!updatedState) continue;

    events.push({
      eventType: isInside ? "ENTER" : "EXIT",
      vehicleId,
      geofenceId: geofence._id,
      geofenceName: geofence.name,
      latitude,
      longitude,
      timestamp,
    });
  }

  return events;
}

module.exports = { processGeofenceTelemetry };