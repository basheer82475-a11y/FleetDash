import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const failures = new Counter('telemetry_write_failures');
const successes = new Counter('telemetry_write_successes');
const rate = Number(__ENV.RATE || 2000);
const duration = __ENV.DURATION || '1m';
const vehicleCount = Math.max(1, Number(__ENV.VEHICLE_COUNT || 1000));
const baseUrl = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
  scenarios: { writes: { executor: 'constant-arrival-rate', rate, timeUnit: '1s', duration, preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 500), maxVUs: Number(__ENV.MAX_VUS || 5000) } },
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const sequence = __VU * 100000000 + __ITER;
  const payload = JSON.stringify({
    vehicleId: `k6-vehicle-${sequence % vehicleCount}`,
    speed: 54.2, latitude: 12.9716, longitude: 77.5946,
    fuelLevel: 74, engineTemperature: 89.5,
    timestamp: new Date().toISOString(),
  });
  const response = http.post(`${baseUrl}/api/telemetry`, payload, { headers: { 'Content-Type': 'application/json' } });
  const ok = check(response, { 'telemetry acknowledged': (r) => r.status === 201 && !!r.json('telemetry.eventId') });
  if (ok) successes.add(1); else failures.add(1);
}
