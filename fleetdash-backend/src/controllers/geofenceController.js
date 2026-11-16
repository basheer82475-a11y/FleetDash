const Geofence = require("../models/Geofence");

function isValidPolygon(coordinates) {
  if (
    !coordinates ||
    coordinates.type !== "Polygon" ||
    !Array.isArray(coordinates.coordinates) ||
    coordinates.coordinates.length === 0
  ) {
    return false;
  }

  return coordinates.coordinates.every((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      return false;
    }

    const validPositions = ring.every(
      (position) =>
        Array.isArray(position) &&
        position.length >= 2 &&
        Number.isFinite(position[0]) &&
        Number.isFinite(position[1]) &&
        position[0] >= -180 &&
        position[0] <= 180 &&
        position[1] >= -90 &&
        position[1] <= 90
    );

    if (!validPositions) return false;

    const first = ring[0];
    const last = ring[ring.length - 1];

    return first[0] === last[0] && first[1] === last[1];
  });
}

async function createGeofence(req, res, next) {
  try {
    const { name, coordinates } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Geofence name is required",
      });
    }

    if (!isValidPolygon(coordinates)) {
      return res.status(400).json({
        success: false,
        error: "Valid closed GeoJSON Polygon coordinates are required",
      });
    }

    const geofence = await Geofence.create({
      name: name.trim(),
      coordinates,
    });

    return res.status(201).json({
      success: true,
      message: "Geofence created successfully",
      geofence,
    });
  } catch (error) {
    next(error);
  }
}

async function getGeofences(req, res, next) {
  try {
    const geofences = await Geofence.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: geofences.length,
      geofences,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGeofence,
  getGeofences,
};