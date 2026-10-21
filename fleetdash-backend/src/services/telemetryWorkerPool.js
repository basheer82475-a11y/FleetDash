const { Worker } = require("node:worker_threads");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const maxWorkers = Math.max(1, Number(process.env.WORKER_POOL_SIZE) || Math.min(4, require("node:os").availableParallelism?.() || 2));
const maxQueue = Math.max(maxWorkers, Number(process.env.WORKER_QUEUE_LIMIT) || 1000);
const slots = [];
const queue = [];
let closed = false;

function createSlot() {
  const slot = { worker: new Worker(path.join(__dirname, "../workers/telemetryWorker.js")), task: null };
  slots.push(slot);
  slot.worker.on("message", (result) => {
    const task = slot.task;
    slot.task = null;
    if (task) result.error ? task.reject(new Error(result.error)) : task.resolve(result.processed);
    dispatch(slot);
  });
  slot.worker.on("error", (error) => {
    if (slot.task) slot.task.reject(error);
    slot.task = null;
  });
  slot.worker.on("exit", (code) => {
    const index = slots.indexOf(slot);
    if (index >= 0) slots.splice(index, 1);
    if (slot.task) slot.task.reject(new Error(`Telemetry worker exited with code ${code}`));
    slot.task = null;
    if (!closed) {
      const replacement = createSlot();
      dispatch(replacement);
    }
  });
  return slot;
}

function dispatch(slot) {
  if (closed || slot.task || !queue.length) return;
  const task = queue.shift();
  slot.task = task;
  slot.worker.postMessage({ id: task.id, reading: task.reading });
}

function processTelemetry(reading) {
  if (closed) return Promise.reject(new Error("Telemetry worker pool is closed"));
  const idle = slots.find((slot) => !slot.task);
  if (!idle && slots.length >= maxWorkers && queue.length >= maxQueue) return Promise.reject(Object.assign(new Error("Telemetry processing capacity exceeded"), { status: 503 }));
  return new Promise((resolve, reject) => {
    const task = { id: randomUUID(), reading, resolve, reject };
    if (idle) { idle.task = task; idle.worker.postMessage({ id: task.id, reading }); }
    else { queue.push(task); if (slots.length < maxWorkers) dispatch(createSlot()); }
  });
}

function closeWorkerPool() {
  closed = true;
  for (const task of queue.splice(0)) task.reject(new Error("Telemetry worker pool is shutting down"));
  return Promise.all(slots.splice(0).map(({ worker, task }) => {
    if (task) task.reject(new Error("Telemetry worker pool is shutting down"));
    return worker.terminate();
  }));
}

module.exports = { processTelemetry, closeWorkerPool, maxWorkers, maxQueue };
