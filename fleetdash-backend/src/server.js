require("dotenv").config();

const mongoose = require("mongoose");
const createApp = require("./app");
const { connectDatabase } = require("./config/database");
const { closeWorkerPool } = require("./services/telemetryWorkerPool");

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be set before starting the API");
  }

  await connectDatabase();

  const app = createApp();
  const port = Number(process.env.PORT) || 5000;
  const server = app.listen(port, () => {
    console.log(`FleetDash API listening on port ${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      await closeWorkerPool();
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error(`FleetDash startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { start };