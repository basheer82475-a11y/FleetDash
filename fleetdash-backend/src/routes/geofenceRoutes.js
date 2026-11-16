const express = require("express");

const {
  createGeofence,
  getGeofences,
} = require("../controllers/geofenceController");

const router = express.Router();

router.post("/", createGeofence);
router.get("/", getGeofences);

module.exports = router;