import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const payload = JSON.stringify({
    vehicleId: `load-test-${__VU}`,
    speed: 60,
    latitude: 16.5062,
    longitude: 80.648,
    fuelLevel: 75,
    engineTemperature: 90,
    timestamp: new Date().toISOString(),
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const response = http.post(
    `${BASE_URL}/api/telemetry`,
    payload,
    params
  );

  check(response, {
    'status is 201': (r) => r.status === 201,
  });

  sleep(1);
}