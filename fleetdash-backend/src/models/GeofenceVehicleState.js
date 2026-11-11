const mongoose = require("mongoose");

const geofenceVehicleStateSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
    },
    geofenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Geofence",
      required: true,
    },
    isInside: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

geofenceVehicleStateSchema.index(
  { vehicleId: 1, geofenceId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "GeofenceVehicleState",
  geofenceVehicleStateSchema
);