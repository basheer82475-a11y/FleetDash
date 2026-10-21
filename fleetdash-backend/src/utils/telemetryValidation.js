const HttpError = require("./httpError");

function validateTelemetry(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Request body must be a JSON object");
  const { vehicleId, speed, latitude, longitude, fuelLevel, engineTemperature, timestamp } = body;
  if (typeof vehicleId !== "string" || !vehicleId.trim() || vehicleId.length > 128) throw new HttpError(400, "vehicleId must be a non-empty string up to 128 characters");
  const numeric = { speed, latitude, longitude, fuelLevel, engineTemperature };
  for (const [name, value] of Object.entries(numeric)) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new HttpError(400, `${name} must be a finite number`);
  }
  if (speed < 0 || speed > 500) throw new HttpError(400, "speed must be between 0 and 500");
  if (latitude < -90 || latitude > 90) throw new HttpError(400, "latitude must be between -90 and 90");
  if (longitude < -180 || longitude > 180) throw new HttpError(400, "longitude must be between -180 and 180");
  if (fuelLevel < 0 || fuelLevel > 100) throw new HttpError(400, "fuelLevel must be between 0 and 100");
  if (engineTemperature < -100 || engineTemperature > 300) throw new HttpError(400, "engineTemperature must be between -100 and 300");
  const date = new Date(timestamp);
  if (timestamp === undefined || !Number.isFinite(date.getTime())) throw new HttpError(400, "timestamp must be a valid date/time");
  return { vehicleId: vehicleId.trim(), speed, latitude, longitude, fuelLevel, engineTemperature, timestamp: date };
}

module.exports = { validateTelemetry };
