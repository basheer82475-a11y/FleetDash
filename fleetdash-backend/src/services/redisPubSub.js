const { createClient } = require("redis");

let publisher;
let subscriber;

async function connectRedis() {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  publisher = createClient({ url: redisUrl });
  subscriber = publisher.duplicate();

  publisher.on("error", (error) => {
    console.error("Redis publisher error:", error.message);
  });

  subscriber.on("error", (error) => {
    console.error("Redis subscriber error:", error.message);
  });

  await Promise.all([
    publisher.connect(),
    subscriber.connect(),
  ]);

  console.log("Redis Pub/Sub connected");
}

// Publish normal telemetry
async function publishTelemetry(payload) {
  if (!publisher?.isReady) {
    throw new Error("Redis publisher is not connected");
  }

  await publisher.publish(
    "fleetdash:telemetry",
    JSON.stringify(payload)
  );
}

// Subscribe to normal telemetry
async function subscribeTelemetry(handler) {
  if (!subscriber?.isReady) {
    throw new Error("Redis subscriber is not connected");
  }

  await subscriber.subscribe("fleetdash:telemetry", (message) => {
    try {
      handler(JSON.parse(message));
    } catch (error) {
      console.error("Invalid telemetry Pub/Sub message:", error.message);
    }
  });
}

// Publish binary telemetry
async function publishBinaryTelemetry(buffer) {
  if (!publisher?.isReady) {
    throw new Error("Redis publisher is not connected");
  }

  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError("Binary telemetry must be a Buffer");
  }

  await publisher.publish(
    "fleetdash:telemetry:binary",
    buffer.toString("base64")
  );
}

// Subscribe to binary telemetry
async function subscribeBinaryTelemetry(handler) {
  if (!subscriber?.isReady) {
    throw new Error("Redis subscriber is not connected");
  }

  await subscriber.subscribe(
    "fleetdash:telemetry:binary",
    (message) => {
      handler(Buffer.from(message, "base64"));
    }
  );
}

// Publish geofence events
async function publishGeofenceEvent(payload) {
  if (!publisher?.isReady) {
    throw new Error("Redis publisher is not connected");
  }

  await publisher.publish(
    "fleetdash:geofence:events",
    JSON.stringify(payload)
  );
}

// Subscribe to geofence events
async function subscribeGeofenceEvents(handler) {
  if (!subscriber?.isReady) {
    throw new Error("Redis subscriber is not connected");
  }

  await subscriber.subscribe(
    "fleetdash:geofence:events",
    (message) => {
      try {
        handler(JSON.parse(message));
      } catch (error) {
        console.error(
          "Invalid geofence event Pub/Sub message:",
          error.message
        );
      }
    }
  );
}

// Close Redis connections
async function closeRedis() {
  await Promise.all([
    publisher?.isOpen ? publisher.quit() : Promise.resolve(),
    subscriber?.isOpen ? subscriber.quit() : Promise.resolve(),
  ]);
}

module.exports = {
  connectRedis,
  publishTelemetry,
  subscribeTelemetry,
  publishBinaryTelemetry,
  subscribeBinaryTelemetry,
  publishGeofenceEvent,
  subscribeGeofenceEvents,
  closeRedis,
};