const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const mongoose = require("mongoose");
const createApp = require("../src/app");
const { validateTelemetry } = require("../src/utils/telemetryValidation");
const { processTelemetry, closeWorkerPool, maxWorkers } = require("../src/services/telemetryWorkerPool");
const TelemetryBucket = require("../src/models/TelemetryBucket");
const { appendReading } = require("../src/services/telemetryService");
const { connectDatabase } = require("../src/config/database");

const valid = {
  vehicleId: "truck-1", speed: 60.126, latitude: 12.9715999, longitude: 77.594566,
  fuelLevel: 72.2, engineTemperature: 88.456, timestamp: "2026-10-21T04:00:00Z",
};

test("health and unknown routes return appropriate HTTP status", async (t) => {
  const app = createApp({ telemetryService: fakeService(), worker: async (x) => x });
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await fetch(`${base}/unknown`)).status, 404);
});

test("telemetry endpoint validates, processes and waits for storage acknowledgement", async (t) => {
  let stored;
  const app = createApp({ telemetryService: { ...fakeService(), appendReading: async (r) => { stored = r; return { timestamp: new Date(r.timestamp) }; } }, worker: async (r) => ({ ...r, speed: 60.13 }) });
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/telemetry`;
  const response = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(valid) });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).telemetry.speed, 60.13);
  assert.equal(stored.vehicleId, "truck-1");
  const invalid = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...valid, latitude: 900 }) });
  assert.equal(invalid.status, 400);
});

test("retrieval routes return chronological pages and latest, including missing vehicles", async (t) => {
  let requested;
  const newest = { vehicleId: "truck-1", speed: 60, timestamp: new Date(valid.timestamp) };
  const service = {
    ...fakeService(),
    getReadings: async (vehicleId, options) => { requested = { vehicleId, options }; return [newest]; },
    getLatest: async (vehicleId) => vehicleId === "truck-1" ? newest : null,
  };
  const server = createApp({ telemetryService: service, worker: async (x) => x }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/telemetry`;
  const page = await fetch(`${base}/truck-1?startTime=2026-10-21T00:00:00Z&endTime=2026-10-22T00:00:00Z&limit=25&offset=10`);
  assert.equal(page.status, 200);
  assert.deepEqual(requested, { vehicleId: "truck-1", options: { startTime: "2026-10-21T00:00:00Z", endTime: "2026-10-22T00:00:00Z", limit: "25", offset: "10" } });
  assert.equal((await fetch(`${base}/truck-1/latest`)).status, 200);
  assert.equal((await fetch(`${base}/unknown/latest`)).status, 404);
});

test("database errors are returned as server errors and are not acknowledged as success", async (t) => {
  const service = { ...fakeService(), appendReading: async () => { throw new Error("database unavailable"); } };
  const server = createApp({ telemetryService: service, worker: async (x) => x }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const originalError = console.error;
  console.error = () => {};
  let response;
  try {
    response = await fetch(`http://127.0.0.1:${server.address().port}/api/telemetry`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(valid),
    });
  } finally { console.error = originalError; }
  assert.equal(response.status, 500);
  assert.equal((await response.json()).success, false);
});

test("worker threads process concurrent telemetry without exceeding pool bound", async (t) => {
  t.after(() => closeWorkerPool());
  const results = await Promise.all(Array.from({ length: maxWorkers * 3 }, (_, i) => processTelemetry({ ...valid, vehicleId: `truck-${i}` })));
  assert.equal(results.length, maxWorkers * 3);
  assert.equal(results[0].speed, 60.13);
  assert.equal(results[0].latitude, 12.9716);
});

test("telemetry validation rejects out of range values", () => {
  assert.throws(() => validateTelemetry({ ...valid, fuelLevel: 101 }), { status: 400 });
});

test("bucket schema enforces bounded bucket fields and uniqueness", async () => {
  const schema = TelemetryBucket.schema;
  assert.ok(schema.path("readings"));
  assert.ok(schema.path("readingCount").options.max <= 1000);
  assert.ok(schema.indexes().some(([keys, options]) => keys.vehicleId && keys.windowStart && options.unique));
  assert.ok(schema.indexes().some(([keys]) => keys.vehicleId && keys.bucketStart && keys.bucketEnd));
  assert.ok(schema.indexes().some(([keys]) => keys.vehicleId && keys.bucketEnd === -1));
  assert.equal(schema.path("readings").schema.path("eventId").isRequired, true);
  const doc = new TelemetryBucket({ vehicleId: "truck-1", windowStart: new Date(), bucketStart: new Date(), bucketEnd: new Date(), readingCount: 1001, readings: [] });
  await assert.rejects(doc.validate());
});

test("telemetry validation assigns a unique event ID for persistence verification", () => {
  const first = validateTelemetry(valid);
  const second = validateTelemetry(valid);
  assert.match(first.eventId, /^[0-9a-f-]{36}$/i);
  assert.notEqual(first.eventId, second.eventId);
});

test("timestamp retrieval prunes non-overlapping buckets and preserves chronological paging", async () => {
  let pipeline;
  const Model = { aggregate: async (value) => { pipeline = value; return []; } };
  const startTime = "2026-10-21T00:00:00Z";
  const endTime = "2026-10-22T00:00:00Z";
  const { getReadings } = require("../src/services/telemetryService");
  const result = await getReadings("truck-1", { startTime, endTime, limit: 20, offset: 40 }, Model);
  assert.deepEqual(result, []);
  assert.deepEqual(pipeline[0].$match, { vehicleId: "truck-1", bucketEnd: { $gte: new Date(startTime) }, bucketStart: { $lte: new Date(endTime) } });
  assert.ok(pipeline[1].$project.readings.$filter);
  assert.deepEqual(pipeline.find((stage) => stage.$sort)?.$sort, { "readings.timestamp": 1, _id: 1 });
  assert.equal(pipeline.find((stage) => stage.$skip)?.$skip, 40);
  assert.equal(pipeline.find((stage) => stage.$limit)?.$limit, 20);
});

test("bucket storage safely acknowledges concurrent appends", async () => {
  const buckets = [];
  const Model = {
    findOne(filter) {
      let found = buckets.filter((bucket) => Object.entries(filter).every(([key, value]) => {
        if (value && typeof value === "object" && "$lt" in value) return bucket[key] < value.$lt;
        return bucket[key]?.getTime?.() === value?.getTime?.() || bucket[key] === value;
      })).sort((a, b) => b.bucketNumber - a.bucketNumber)[0] || null;
      return { sort: () => ({ select: async () => found }) };
    },
    async updateOne(filter, update) {
      const bucket = buckets.find((item) => Object.entries(filter).every(([key, value]) => key === "readingCount" ? item[key] < value.$lt : item[key]?.getTime?.() === value?.getTime?.() || item[key] === value));
      if (!bucket) return { modifiedCount: 0 };
      bucket.readings.push(update.$push.readings);
      bucket.readingCount += update.$inc.readingCount;
      bucket.bucketStart = new Date(Math.min(bucket.bucketStart, update.$min.bucketStart));
      bucket.bucketEnd = new Date(Math.max(bucket.bucketEnd, update.$max.bucketEnd));
      return { modifiedCount: 1 };
    },
    async create(document) {
      if (buckets.some((bucket) => bucket.vehicleId === document.vehicleId && bucket.windowStart.getTime() === document.windowStart.getTime() && bucket.bucketNumber === document.bucketNumber)) throw Object.assign(new Error("duplicate"), { code: 11000 });
      buckets.push(document);
      return document;
    },
  };
  const results = await Promise.all(Array.from({ length: 30 }, (_, i) => appendReading({ ...valid, speed: i }, Model)));
  assert.equal(results.length, 30);
  assert.equal(buckets.reduce((count, bucket) => count + bucket.readingCount, 0), 30);
  assert.ok(buckets.every((bucket) => bucket.readings.length === bucket.readingCount && bucket.readingCount <= 1000));
});

test("database config reports missing Mongo URI clearly", async () => {
  await assert.rejects(connectDatabase(""), /MONGO_URI is required/);
  assert.equal(mongoose.connection.readyState, 0);
});

test("Mongo connection failure is surfaced when MongoDB is unavailable", async () => {
  const previous = process.env.MONGO_CONNECT_TIMEOUT_MS;
  process.env.MONGO_CONNECT_TIMEOUT_MS = "250";
  try {
    await assert.rejects(connectDatabase("mongodb://127.0.0.1:1/fleetdash?serverSelectionTimeoutMS=250"));
  } finally {
    await mongoose.disconnect();
    if (previous === undefined) delete process.env.MONGO_CONNECT_TIMEOUT_MS;
    else process.env.MONGO_CONNECT_TIMEOUT_MS = previous;
  }
});

function fakeService() {
  return {
    appendReading: async (reading) => ({ timestamp: new Date(reading.timestamp) }),
    getReadings: async () => [],
    getLatest: async () => null,
  };
}
