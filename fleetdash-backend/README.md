# FleetDash backend

## Run

From `FleetDash/fleetdash-backend`, copy `.env.example` to `.env`, set `MONGO_URI` to a reachable MongoDB Atlas connection string, then run:

```sh
npm install
npm start
```

For development, use `npm run dev`. The API listens on `PORT` (default `5000`) only after Mongoose connects successfully.

## API

- `GET /api/health` — liveness check.
- `POST /api/telemetry` — validate and process a reading in a bounded worker pool, then acknowledge after MongoDB stores it.
- `GET /api/telemetry/:vehicleId?startTime=&endTime=&limit=100&offset=0` — chronological, paginated readings.
- `GET /api/telemetry/:vehicleId/latest` — latest reading; returns `404` when none exist.

Telemetry buckets are grouped by vehicle and configured time window. The unique vehicle/window/bucket-number index and conditional atomic updates prevent concurrent appends from exceeding each bucket's configured maximum.

Run the automated tests with `npm test`.
