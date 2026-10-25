const TelemetryBucket = require("../models/TelemetryBucket");
const HttpError = require("../utils/httpError");

// ==========================================
// 1. Bucket Configuration
// ==========================================

const WINDOW_MS = Math.max(
  60000,
  Number(process.env.TELEMETRY_BUCKET_WINDOW_MS) || 15 * 60 * 1000
);

const BUCKET_MAX = Math.min(
  1000,
  Math.max(
    1,
    Number(process.env.TELEMETRY_BUCKET_MAX_READINGS) || 500
  )
);

function windowStartFor(date) {
  return new Date(
    Math.floor(date.getTime() / WINDOW_MS) * WINDOW_MS
  );
}

// ==========================================
// 2. Store Telemetry in MongoDB Buckets
// ==========================================

async function appendReading(reading, Model = TelemetryBucket) {
  const timestamp = new Date(reading.timestamp);

  const windowStart = windowStartFor(timestamp);

  const fields = {
    vehicleId: reading.vehicleId,
    windowStart,
  };

  const values = {
    ...reading,
    timestamp,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const open = await Model.findOne({
      ...fields,
      readingCount: { $lt: BUCKET_MAX },
    })
      .sort({ bucketNumber: -1 })
      .select({ bucketNumber: 1 });

    if (open) {
      const result = await Model.updateOne(
        {
          ...fields,
          bucketNumber: open.bucketNumber,
          readingCount: { $lt: BUCKET_MAX },
        },
        {
          $push: { readings: values },
          $inc: { readingCount: 1 },
          $min: { bucketStart: timestamp },
          $max: { bucketEnd: timestamp },
        }
      );

      if (result.modifiedCount === 1) {
        return {
          bucketed: true,
          timestamp,
        };
      }

      continue;
    }

    const last = await Model.findOne(fields)
      .sort({ bucketNumber: -1 })
      .select({ bucketNumber: 1 });

    const bucketNumber = last
      ? last.bucketNumber + 1
      : 0;

    try {
      await Model.create({
        ...fields,
        bucketNumber,
        bucketStart: timestamp,
        bucketEnd: timestamp,
        readingCount: 1,
        readings: [values],
      });

      return {
        bucketed: true,
        timestamp,
      };
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  throw new Error(
    "Could not allocate a bounded telemetry bucket after concurrent writes"
  );
}

// ==========================================
// 3. Date Validation
// ==========================================

function parseDateParameter(value, name) {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new HttpError(
      400,
      `${name} must be a valid date/time`
    );
  }

  return date;
}

// ==========================================
// 4. Validate Vehicle ID
// ==========================================

function validateVehicleId(vehicleId) {
  if (
    typeof vehicleId !== "string" ||
    !vehicleId ||
    vehicleId.length > 128
  ) {
    throw new HttpError(
      400,
      "Invalid vehicleId"
    );
  }
}

// ==========================================
// 5. Optimized Telemetry Retrieval
// ==========================================

async function getReadings(
  vehicleId,
  {
    startTime,
    endTime,
    limit = 100,
    offset = 0,
  } = {},
  Model = TelemetryBucket
) {
  validateVehicleId(vehicleId);

  const start = parseDateParameter(
    startTime,
    "startTime"
  );

  const end = parseDateParameter(
    endTime,
    "endTime"
  );

  if (start && end && start > end) {
    throw new HttpError(
      400,
      "startTime must be earlier than or equal to endTime"
    );
  }

  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 500
  ) {
    throw new HttpError(
      400,
      "limit must be an integer from 1 to 500"
    );
  }

  if (
    !Number.isSafeInteger(parsedOffset) ||
    parsedOffset < 0
  ) {
    throw new HttpError(
      400,
      "offset must be a non-negative integer"
    );
  }

  // ========================================
  // Indexed Bucket Filtering
  // ========================================

  const bucketMatch = {
    vehicleId,
  };

  if (start) {
    bucketMatch.bucketEnd = {
      $gte: start,
    };
  }

  if (end) {
    bucketMatch.bucketStart = {
      $lte: end,
    };
  }

  // ========================================
  // Filter Readings Inside Buckets
  // ========================================

  const conditions = [];

  if (start) {
    conditions.push({
      $gte: [
        "$$reading.timestamp",
        start,
      ],
    });
  }

  if (end) {
    conditions.push({
      $lte: [
        "$$reading.timestamp",
        end,
      ],
    });
  }

  const readingFilter = conditions.length
    ? {
        $filter: {
          input: "$readings",
          as: "reading",
          cond: {
            $and: conditions,
          },
        },
      }
    : "$readings";

  // ========================================
  // Optimized Aggregation Pipeline
  // ========================================

  const pipeline = [
    {
      $match: bucketMatch,
    },

    {
      $project: {
        vehicleId: 1,
        readings: readingFilter,
      },
    },

    {
      $unwind: "$readings",
    },

    {
      $sort: {
        "readings.timestamp": 1,
        _id: 1,
        "readings._id": 1,
      },
    },

    {
      $skip: parsedOffset,
    },

    {
      $limit: parsedLimit,
    },

    {
      $project: {
        _id: "$readings._id",
        vehicleId: 1,
        speed: "$readings.speed",
        latitude: "$readings.latitude",
        longitude: "$readings.longitude",
        fuelLevel: "$readings.fuelLevel",
        engineTemperature:
          "$readings.engineTemperature",
        timestamp: "$readings.timestamp",
      },
    },
  ];

  return Model.aggregate(pipeline);
}

// ==========================================
// 6. Optimized Latest Telemetry Retrieval
// ==========================================

async function getLatest(
  vehicleId,
  Model = TelemetryBucket
) {
  validateVehicleId(vehicleId);

  const pipeline = [
    {
      $match: {
        vehicleId,
      },
    },

    {
      $project: {
        vehicleId: 1,
        readings: 1,
      },
    },

    {
      $unwind: "$readings",
    },

    {
      $sort: {
        "readings.timestamp": -1,
        _id: -1,
        "readings._id": -1,
      },
    },

    {
      $limit: 1,
    },

    {
      $project: {
        _id: "$readings._id",
        vehicleId: 1,
        speed: "$readings.speed",
        latitude: "$readings.latitude",
        longitude: "$readings.longitude",
        fuelLevel: "$readings.fuelLevel",
        engineTemperature:
          "$readings.engineTemperature",
        timestamp: "$readings.timestamp",
      },
    },
  ];

  const [latest] = await Model.aggregate(pipeline);

  return latest || null;
}

// ==========================================
// 7. Export Member 1 Services
// ==========================================

module.exports = {
  appendReading,
  getReadings,
  getLatest,
  WINDOW_MS,
  BUCKET_MAX,
};