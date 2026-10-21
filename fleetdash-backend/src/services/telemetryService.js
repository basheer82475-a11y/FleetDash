const TelemetryBucket = require("../models/TelemetryBucket");
const HttpError = require("../utils/httpError");

const WINDOW_MS = Math.max(60000, Number(process.env.TELEMETRY_BUCKET_WINDOW_MS) || 15 * 60 * 1000);
const BUCKET_MAX = Math.min(1000, Math.max(1, Number(process.env.TELEMETRY_BUCKET_MAX_READINGS) || 500));

function windowStartFor(date) { return new Date(Math.floor(date.getTime() / WINDOW_MS) * WINDOW_MS); }

async function appendReading(reading, Model = TelemetryBucket) {
  const timestamp = new Date(reading.timestamp);
  const windowStart = windowStartFor(timestamp);
  const fields = { vehicleId: reading.vehicleId, windowStart };
  const values = { ...reading, timestamp };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const open = await Model.findOne({ ...fields, readingCount: { $lt: BUCKET_MAX } }).sort({ bucketNumber: -1 }).select({ bucketNumber: 1 });
    if (open) {
      const result = await Model.updateOne(
        { ...fields, bucketNumber: open.bucketNumber, readingCount: { $lt: BUCKET_MAX } },
        { $push: { readings: values }, $inc: { readingCount: 1 }, $min: { bucketStart: timestamp }, $max: { bucketEnd: timestamp } },
      );
      if (result.modifiedCount === 1) return { bucketed: true, timestamp };
      continue;
    }
    const last = await Model.findOne(fields).sort({ bucketNumber: -1 }).select({ bucketNumber: 1 });
    const bucketNumber = last ? last.bucketNumber + 1 : 0;
    try {
      await Model.create({ ...fields, bucketNumber, bucketStart: timestamp, bucketEnd: timestamp, readingCount: 1, readings: [values] });
      return { bucketed: true, timestamp };
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  throw new Error("Could not allocate a bounded telemetry bucket after concurrent writes");
}

function parseDateParameter(value, name) {
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new HttpError(400, `${name} must be a valid date/time`);
  return date;
}

async function getReadings(vehicleId, { startTime, endTime, limit = 100, offset = 0 } = {}, Model = TelemetryBucket) {
  if (!vehicleId || vehicleId.length > 128) throw new HttpError(400, "Invalid vehicleId");
  const start = parseDateParameter(startTime, "startTime");
  const end = parseDateParameter(endTime, "endTime");
  if (start && end && start > end) throw new HttpError(400, "startTime must be earlier than or equal to endTime");
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) throw new HttpError(400, "limit must be an integer from 1 to 500");
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) throw new HttpError(400, "offset must be a non-negative integer");
  const timestampMatch = {};
  if (start) timestampMatch.$gte = start;
  if (end) timestampMatch.$lte = end;
  const pipeline = [
    { $match: { vehicleId } },
    { $unwind: "$readings" },
    ...(Object.keys(timestampMatch).length ? [{ $match: { "readings.timestamp": timestampMatch } }] : []),
    { $sort: { "readings.timestamp": 1, _id: 1 } },
    { $skip: parsedOffset }, { $limit: parsedLimit },
    { $project: { _id: "$readings._id", vehicleId: 1, speed: "$readings.speed", latitude: "$readings.latitude", longitude: "$readings.longitude", fuelLevel: "$readings.fuelLevel", engineTemperature: "$readings.engineTemperature", timestamp: "$readings.timestamp" } },
  ];
  return Model.aggregate(pipeline);
}

async function getLatest(vehicleId, Model = TelemetryBucket) {
  if (!vehicleId || vehicleId.length > 128) throw new HttpError(400, "Invalid vehicleId");
  const [latest] = await Model.aggregate([
    { $match: { vehicleId } }, { $unwind: "$readings" },
    { $sort: { "readings.timestamp": -1, _id: -1 } }, { $limit: 1 },
    { $project: { _id: "$readings._id", vehicleId: 1, speed: "$readings.speed", latitude: "$readings.latitude", longitude: "$readings.longitude", fuelLevel: "$readings.fuelLevel", engineTemperature: "$readings.engineTemperature", timestamp: "$readings.timestamp" } },
  ]);
  return latest || null;
}

module.exports = { appendReading, getReadings, getLatest, WINDOW_MS, BUCKET_MAX };
