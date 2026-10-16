const express = require("express");

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("FleetDash Backend is running!");
});

app.listen(PORT, () => {
  console.log(`FleetDash server running on port ${PORT}`);
});