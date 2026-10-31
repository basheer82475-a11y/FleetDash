require("dotenv").config();

const mongoose = require("mongoose");
const TelemetryBucket = require("../src/models/TelemetryBucket");
const { connectDatabase } = require("../src/config/database");
const { getReadings, getLatest } = require("../src/services/telemetryService");

const vehicleId = process.env.BENCHMARK_VEHICLE_ID;
const iterations = Math.max(1, Number(process.env.BENCHMARK_ITERATIONS) || 100);

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
  return sorted[index];
}

function summarize(samples) {
  if (!samples.length) {
    return {
      iterations: 0,
      averageMs: 0,
      p95Ms: 0,
      p99Ms: 0,
      minMs: 0,
      maxMs: 0,
    };
  }

  return {
    iterations: samples.length,
    averageMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    p95Ms: percentile(samples, 0.95),
    p99Ms: percentile(samples, 0.99),
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
  };
}

async function measureQuery(name, operation, explainQuery) {
  const samples = [];
  let explainStats = null;

  for (let i = 0; i < iterations; i += 1) {
    const start = process.hrtime.bigint();
    await operation();
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    samples.push(elapsedMs);
  }

  if (explainQuery) {
    explainStats = await explainQuery();
  }

  return {
    name,
    ...summarize(samples),
    mongoExecutionTimeMs: explainStats?.executionStats?.executionTimeMillis ?? null,
    documentsExamined: explainStats?.executionStats?.totalDocsExamined ?? null,
    indexKeysExamined: explainStats?.executionStats?.totalKeysExamined ?? null,
    returnedDocuments: explainStats?.executionStats?.nReturned ?? null,
    winningPlan: explainStats?.queryPlanner?.winningPlan ?? null,
  };
}

async function main() {
  if (!vehicleId) {
    throw new Error("Set BENCHMARK_VEHICLE_ID to a seeded vehicle before running the benchmark");
  }

  await connectDatabase();
  await TelemetryBucket.syncIndexes();

  const now = new Date();
  const startTime = new Date(now.getTime() - 60 * 60 * 1000);

  const vehicleBucketLookup = async () =>
    TelemetryBucket.find({ vehicleId })
      .sort({ bucketEnd: -1 })
      .limit(10)
      .lean();

  const rangeRead = async () =>
    getReadings(vehicleId, {
      startTime,
      endTime: now,
      limit: 100,
      offset: 0,
    });

  const latestRead = async () => getLatest(vehicleId);

  const reports = await Promise.all([
    measureQuery(
      "vehicle-bucket-lookup",
      vehicleBucketLookup,
      async () =>
        TelemetryBucket.find({ vehicleId })
          .sort({ bucketEnd: -1 })
          .limit(10)
          .lean()
          .explain("executionStats")
    ),
    measureQuery(
      "time-range-telemetry-retrieval",
      rangeRead,
      async () =>
        TelemetryBucket.aggregate([
          {
            $match: {
              vehicleId,
              bucketEnd: { $gte: startTime },
              bucketStart: { $lte: now },
            },
          },
          {
            $project: {
              vehicleId: 1,
              readings: 1,
            },
          },
          { $unwind: "$readings" },
          {
            $match: {
              "readings.timestamp": { $gte: startTime, $lte: now },
            },
          },
        ]).explain("executionStats")
    ),
    measureQuery(
      "latest-telemetry-retrieval",
      latestRead,
      async () =>
        TelemetryBucket.aggregate([
          { $match: { vehicleId } },
          { $sort: { bucketEnd: -1 } },
          { $limit: 1 },
          { $project: { vehicleId: 1, readings: 1 } },
          { $unwind: "$readings" },
          { $sort: { "readings.timestamp": -1, "readings._id": -1 } },
          { $limit: 1 },
        ]).explain("executionStats")
    ),
  ]);

  const indexes = await TelemetryBucket.collection.indexes();

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        benchmarkVehicleId: vehicleId,
        mongoVersion: (await mongoose.connection.db.admin().serverInfo()).version,
        collectionDocuments: await TelemetryBucket.countDocuments(),
        indexes: indexes.map((index) => ({ name: index.name, key: index.key })),
        measurements: reports,
        notes: [
          "averageMs, p95Ms, p99Ms, minMs, and maxMs are application-observed latencies including network and processing.",
          "mongoExecutionTimeMs is MongoDB server-side execution time from explain(executionStats).",
          "A result under 5 ms is a target, not a guarantee; results depend on Atlas load and cache state.",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Benchmark failed:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
