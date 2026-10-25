require("dotenv").config();

const mongoose = require("mongoose");
const TelemetryBucket = require("../src/models/TelemetryBucket");

async function runBenchmark() {
  try {
    console.log("Connecting to MongoDB Atlas...");

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully!");

    const vehicleId = process.env.BENCHMARK_VEHICLE_ID || "vehicle-101";

    // Confirm that MongoDB indexes exist
    const indexes = await TelemetryBucket.collection.indexes();

    console.log("\nAvailable MongoDB Indexes:");
    console.table(indexes.map((index) => ({
      name: index.name,
      fields: JSON.stringify(index.key),
    })));

    // Measure vehicle-specific bucket lookup
    const query = {
      vehicleId,
    };

    const start = performance.now();

    const buckets = await TelemetryBucket.find(query)
      .sort({ bucketEnd: -1 })
      .limit(10)
      .lean();

    const duration = performance.now() - start;

    console.log("\nDatabase Query Results:");
    console.log("Vehicle ID:", vehicleId);
    console.log("Buckets retrieved:", buckets.length);
    console.log("Application-observed query time:", duration.toFixed(3), "ms");

    // Inspect the MongoDB query execution plan
    const explanation = await TelemetryBucket.find(query)
      .sort({ bucketEnd: -1 })
      .limit(10)
      .explain("executionStats");

    console.log("\nMongoDB Execution Statistics:");

    console.log(
      "Execution time:",
      explanation.executionStats?.executionTimeMillis,
      "ms"
    );

    console.log(
      "Documents examined:",
      explanation.executionStats?.totalDocsExamined
    );

    console.log(
      "Index keys examined:",
      explanation.executionStats?.totalKeysExamined
    );

    const winningPlan = explanation.queryPlanner?.winningPlan;

    console.log(
      "Winning query plan:",
      JSON.stringify(winningPlan, null, 2)
    );

    console.log("\nBenchmark completed.");

    if (buckets.length === 0) {
      console.log(
        "No buckets found for this vehicle. Use a vehicleId with stored data for a meaningful benchmark."
      );
    }

  } catch (error) {
    console.error("Benchmark failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runBenchmark();