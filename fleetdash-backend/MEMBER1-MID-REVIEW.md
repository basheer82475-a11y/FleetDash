# FleetDash Member 1 mid-project review

## Architecture and storage

`src/server.js` connects MongoDB before listening, then closes HTTP, worker threads, and the database on shutdown. `src/services/telemetryWorkerPool.js` bounds CPU work to a configurable number of worker threads and queue entries. `src/services/telemetryService.js` stores readings in bounded time-window buckets; a unique `(vehicleId, windowStart, bucketNumber)` index and conditional updates protect concurrent bucket appends. `POST /api/telemetry` validates input, assigns a unique `eventId`, processes it in a worker, persists it, and acknowledges only after storage succeeds.

## Indexes and retrieval

The bucket indexes are:

- Unique `{ vehicleId: 1, windowStart: 1, bucketNumber: 1 }` for bucket identity and append allocation.
- `{ vehicleId: 1, bucketStart: 1, bucketEnd: 1 }` for vehicle and bucket time-overlap filtering.
- `{ vehicleId: 1, bucketEnd: -1 }` for latest-bucket ordering.

`GET /api/telemetry/:vehicleId` retains its `startTime`, `endTime`, `limit`, and `offset` parameters and the existing response shape. It validates bounds, filters candidate buckets before unwinding, filters readings inside each selected bucket, sorts chronologically with a deterministic tie key, and projects only response fields. `GET /api/telemetry/:vehicleId/latest` returns the newest reading or the existing 404 response. Range reads still need to sort matched readings after extraction; offset pagination becomes more expensive for deep pages.

## Performance benchmark

Prepare a dedicated test database with representative telemetry buckets, then set `BENCHMARK_VEHICLE_ID` and optionally `BENCHMARK_ITERATIONS` in the shell. Run:

```sh
node scripts/benchmark-queries.js
```

The script reports the MongoDB version, bucket document count, installed indexes, repeated client-observed average/P95/P99 latency, and `explain("executionStats")` for range and latest-bucket index paths. `executionTimeMillis` is database execution time; the repeated service timings include round trips and aggregation result transfer. Results depend on the database, host, data distribution, and cache state. No measurements have been recorded in this document because they must come from a real run against the intended test dataset. Treat any query above 5 ms as above target and use its execution stats to guide further work.

Suggested benchmark record: date/time, environment, MongoDB version, dataset count and time span, index definitions, warm-up policy, iteration count, average/P95/P99, `nReturned`, `totalDocsExamined`, `totalKeysExamined`, and execution time for each explain plan.

## Load testing and omission verification

The k6 script defaults to the review target of 2,000 POST starts/second for one minute. Configure `BASE_URL`, `RATE`, `DURATION`, `VEHICLE_COUNT`, `PREALLOCATED_VUS`, and `MAX_VUS` as needed:

```sh
k6 run k6/telemetry-write.js
k6 run -e BASE_URL=http://localhost:5000 -e RATE=2000 -e DURATION=1m -e VEHICLE_COUNT=1000 k6/telemetry-write.js
```

Run only against a dedicated test database and a deliberately provisioned local or approved test environment. Do not aim this at a production or shared Atlas database. k6's summary includes request rate and latency statistics; the script also reports acknowledged and failed POST counts.

Capture the `telemetry.eventId` values from successful POST responses, one per line in a file, then set `ACKNOWLEDGED_EVENT_IDS` and run:

```sh
node scripts/verify-event-persistence.js
```

The verifier compares acknowledged IDs with stored readings and reports missing IDs and duplicate acknowledgements/persisted IDs. A zero-omission result is valid only for the captured run after writes have settled and only when this command exits successfully.

## Automated checks and demo commands

From this directory:

```sh
npm test
npm start
curl http://localhost:5000/api/health
curl 'http://localhost:5000/api/telemetry/truck-1?limit=25&offset=0'
curl http://localhost:5000/api/telemetry/truck-1/latest
node scripts/benchmark-queries.js
node scripts/verify-event-persistence.js
```

The automated suite covers request validation and acknowledgement behavior, worker-thread normalization, bucket bounds and concurrency, index definitions, query range pruning and pagination pipeline, and database connection failure handling. Live query plans, Atlas latency, the under-5-ms target, k6 capacity, and end-to-end omission status remain unverified until the commands are run against a seeded dedicated database and recorded here.
