const mongoose = require("mongoose");

const geofenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

geofenceSchema.index({ coordinates: "2dsphere" });

module.exports = mongoose.model("Geofence", geofenceSchema);