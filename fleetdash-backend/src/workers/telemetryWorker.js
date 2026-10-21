const { parentPort } = require("node:worker_threads");

parentPort.on("message", ({ id, reading }) => {
  try {
    // Keep CPU work isolated and return a plain, cloneable normalized record.
    const processed = {
      ...reading,
      vehicleId: reading.vehicleId.trim(),
      timestamp: new Date(reading.timestamp).toISOString(),
      speed: Math.round(reading.speed * 100) / 100,
      latitude: Math.round(reading.latitude * 1e6) / 1e6,
      longitude: Math.round(reading.longitude * 1e6) / 1e6,
      fuelLevel: Math.round(reading.fuelLevel * 100) / 100,
      engineTemperature: Math.round(reading.engineTemperature * 100) / 100,
    };
    parentPort.postMessage({ id, processed });
  } catch (error) {
    parentPort.postMessage({ id, error: error.message });
  }
});
