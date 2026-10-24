require("dotenv").config();

const mongoose = require("mongoose");
const { createServer } = require("node:http");
const attachSocketServer = require("./services/socketServer");
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

  // Create one HTTP server for Express and Socket.IO.
  const httpServer = createServer(app);

  const io = attachSocketServer(httpServer);
  
  httpServer.listen(port, () => {
    console.log(`FleetDash API listening on port ${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down`);

    io.close(() => {
      httpServer.close(async () => {
        try {
          await closeWorkerPool();
          await mongoose.disconnect();
          process.exit(0);
        } catch (error) {
          console.error(`Shutdown failed: ${error.message}`);
          process.exitCode = 1;
        }
      });
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return httpServer;
}

if (require.main === module) {
  start().catch((error) => {
    console.error(`FleetDash startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { start };