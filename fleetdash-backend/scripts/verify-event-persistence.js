require("dotenv").config();
const fs = require("node:fs");
const readline = require("node:readline");
const mongoose = require("mongoose");
const { connectDatabase } = require("../src/config/database");
const TelemetryBucket = require("../src/models/TelemetryBucket");

async function main() {
  const inputPath = process.env.ACKNOWLEDGED_EVENT_IDS;
  if (!inputPath) throw new Error("Set ACKNOWLEDGED_EVENT_IDS to a newline-delimited file of eventId values returned by successful POST responses");
  const acknowledged = [];
  for await (const line of readline.createInterface({ input: fs.createReadStream(inputPath), crlfDelay: Infinity })) {
    const id = line.trim();
    if (id) acknowledged.push(id);
  }
  await connectDatabase();
  const persisted = await TelemetryBucket.aggregate([
    { $unwind: "$readings" },
    { $match: { "readings.eventId": { $in: [...new Set(acknowledged)] } } },
    { $group: { _id: "$readings.eventId", copies: { $sum: 1 } } },
  ]);
  const counts = new Map(persisted.map(({ _id, copies }) => [_id, copies]));
  const expected = new Set(acknowledged);
  const missingIds = [...expected].filter((id) => !counts.has(id));
  const duplicatePersistedIds = [...counts].filter(([, copies]) => copies > 1).map(([id]) => id);
  const duplicateAcknowledgedIds = acknowledged.filter((id, index) => acknowledged.indexOf(id) !== index);
  console.log(JSON.stringify({ acknowledgedEvents: acknowledged.length, uniqueAcknowledgedEvents: expected.size, persistedEventIds: counts.size, persistedRecordsForAcknowledgedEvents: [...counts.values()].reduce((sum, count) => sum + count, 0), missingCount: missingIds.length, missingIds, duplicateAcknowledgementCount: duplicateAcknowledgedIds.length, duplicatePersistedEventIdCount: duplicatePersistedIds.length, duplicatePersistedIds, zeroOmission: missingIds.length === 0 && duplicateAcknowledgedIds.length === 0 && duplicatePersistedIds.length === 0 }, null, 2));
  if (missingIds.length || duplicateAcknowledgedIds.length || duplicatePersistedIds.length) process.exitCode = 2;
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
