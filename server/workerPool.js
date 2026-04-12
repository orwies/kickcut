'use strict';

const { Worker } = require('worker_threads');
const { randomUUID } = require('crypto');
const os = require('os');

class WorkerPool {
  constructor(workerScript, sharedData, size) {
    this.workerScript = workerScript;
    this.sharedData = sharedData;
    this.size = size || Math.max(2, os.cpus().length);
    this._workers = [];
    this._pending = new Map(); // taskId → { resolve, reject, timer }
    this._queue = [];          // [{ task, done }]

    for (let i = 0; i < this.size; i++) {
      this._spawnWorker(i);
    }
    console.log(`[WorkerPool] Spawned ${this.size} worker threads`);
  }

  /**
   * Dispatch an action to an available worker thread.
   * Includes a 30-second timeout so requests never hang forever.
   */
  dispatch(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const taskId = randomUUID();
      const task = { taskId, action, payload };

      // Safety net: if storage server / DB is down, return an error after 30s
      const timer = setTimeout(() => {
        this._pending.delete(taskId);
        const qi = this._queue.findIndex((q) => q.task.taskId === taskId);
        if (qi !== -1) this._queue.splice(qi, 1);
        const err = new Error(
          'Request timed out. Make sure the storage server and database are running.'
        );
        err.status = 503;
        reject(err);
      }, 30000);

      const done = { resolve, reject, timer };
      const idle = this._workers.find((w) => !w.busy);

      if (idle) {
        idle.busy = true;
        this._pending.set(taskId, done);
        idle.thread.postMessage(task);
      } else {
        this._queue.push({ task, done });
      }
    });
  }

  _spawnWorker(id) {
    const thread = new Worker(this.workerScript, {
      workerData: { ...this.sharedData, WORKER_ID: id },
    });
    const entry = { thread, busy: false, id };
    this._workers.push(entry);

    thread.on('message', ({ taskId, success, data, status, message }) => {
      const done = this._pending.get(taskId);
      if (!done) return;
      clearTimeout(done.timer);
      this._pending.delete(taskId);
      entry.busy = false;
      this._drainQueue();

      if (success) {
        done.resolve(data);
      } else {
        const err = new Error(message || 'Worker error');
        err.status = status || 500;
        done.reject(err);
      }
    });

    thread.on('error', (err) => {
      console.error(`[WorkerPool] Worker #${id} error:`, err.message);
      this._removeWorker(entry);
      setTimeout(() => this._spawnWorker(id), 1000);
    });

    // FIX: respawn on non-zero exit (e.g. process.exit(1) in worker)
    thread.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[WorkerPool] Worker #${id} exited (code ${code}), respawning in 2s...`);
        this._removeWorker(entry);
        setTimeout(() => this._spawnWorker(id), 2000);
      }
    });
  }

  _removeWorker(entry) {
    const idx = this._workers.indexOf(entry);
    if (idx !== -1) this._workers.splice(idx, 1);
  }

  _drainQueue() {
    if (this._queue.length === 0) return;
    const idle = this._workers.find((w) => !w.busy);
    if (!idle) return;

    const { task, done } = this._queue.shift();
    idle.busy = true;
    this._pending.set(task.taskId, done);
    idle.thread.postMessage(task);
  }
}

module.exports = WorkerPool;
