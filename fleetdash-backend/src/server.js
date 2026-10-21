const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FleetDash Backend Running Successfully",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "Healthy",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FleetDash Backend running on port ${PORT}`);
});
