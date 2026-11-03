const test = require("node:test");
const assert = require("node:assert/strict");

const {
  connectRedis,
  publishTelemetry,
  subscribeTelemetry,
  publishBinaryTelemetry,
  subscribeBinaryTelemetry,
  closeRedis,
} = require("../src/services/redisPubSub");

function receiveOnce(subscribe) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Redis message not received within 5 seconds"));
    }, 5000);

    subscribe((message) => {
      clearTimeout(timer);
      resolve(message);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

test("Redis Pub/Sub handles JSON and binary telemetry", async () => {
  await connectRedis();

  try {
    // Test JSON telemetry
    const jsonData = {
      vehicleId: "truck-test",
      speed: 60,
    };

    const jsonReceived = receiveOnce(subscribeTelemetry);
    await publishTelemetry(jsonData);

    assert.deepEqual(await jsonReceived, jsonData);

    // Test binary telemetry
    const originalBuffer = Buffer.from("FleetDash binary test");

    const binaryReceived = receiveOnce(subscribeBinaryTelemetry);
    await publishBinaryTelemetry(originalBuffer);

    assert.deepEqual(await binaryReceived, originalBuffer);

    // Test invalid input
    await assert.rejects(
      () => publishBinaryTelemetry("not a buffer"),
      TypeError
    );
  } finally {
    await closeRedis();
  }
});