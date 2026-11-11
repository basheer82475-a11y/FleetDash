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
  let resolveMessage;
  let rejectMessage;

  const message = new Promise((resolve, reject) => {
    resolveMessage = resolve;
    rejectMessage = reject;
  });

  const timer = setTimeout(() => {
    rejectMessage(
      new Error("Redis message not received within 5 seconds")
    );
  }, 5000);

  const ready = subscribe((data) => {
    clearTimeout(timer);
    resolveMessage(data);
  }).catch((error) => {
    clearTimeout(timer);
    rejectMessage(error);
    throw error;
  });

  return { ready, message };
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

    // Wait until subscriber is ready before publishing.
    await jsonReceived.ready;

    await publishTelemetry(jsonData);

    assert.deepEqual(await jsonReceived.message, jsonData);

    // Test binary telemetry
    const originalBuffer = Buffer.from("FleetDash binary test");

    const binaryReceived = receiveOnce(subscribeBinaryTelemetry);

    // Wait until subscriber is ready before publishing.
    await binaryReceived.ready;

    await publishBinaryTelemetry(originalBuffer);

    assert.deepEqual(
      await binaryReceived.message,
      originalBuffer
    );

    // Test invalid input
    await assert.rejects(
      () => publishBinaryTelemetry("not a buffer"),
      TypeError
    );
  } finally {
    await closeRedis();
  }
});