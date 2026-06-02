import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';

type Job = { id: string; json: any; options: any; resolve: (v: any) => void; reject: (e: any) => void; timeout: NodeJS.Timeout };

const MAX_WORKERS = Math.max(2, require('os').cpus().length - 1);

const builtWorkerPath = path.join(process.cwd(), 'dist', 'worker', 'infer-worker.js');
const tsWorkerPath = path.join(__dirname, 'infer-worker.ts');

class PooledWorker {
  worker: Worker;
  busy = false;
  jobs = new Map<string, Job>();

  constructor(useBuilt: boolean) {
    const file = useBuilt && fs.existsSync(builtWorkerPath) ? builtWorkerPath : tsWorkerPath;
    const opts: any = {};
    if (file.endsWith('.ts')) opts.execArgv = ['-r', 'ts-node/register'];
    this.worker = new Worker(file, opts);
    this.worker.on('message', (m: any) => this.onMessage(m));
    this.worker.on('error', (e) => {
      for (const job of this.jobs.values()) job.reject(e);
      this.jobs.clear();
    });
    this.worker.on('exit', (code) => {
      if (code !== 0) {
        const err = new Error('Worker exited with ' + code);
        for (const job of this.jobs.values()) job.reject(err);
      }
      this.jobs.clear();
    });
  }

  post(job: Job) {
    this.jobs.set(job.id, job);
    this.busy = true;
    this.worker.postMessage({ id: job.id, json: job.json, options: job.options });
  }

  onMessage(m: any) {
    const job = this.jobs.get(m.id);
    if (!job) return;
    clearTimeout(job.timeout);
    this.jobs.delete(m.id);
    if (this.jobs.size === 0) this.busy = false;
    if (m.ok) job.resolve(m.schema);
    else job.reject(new Error(m.error || 'worker error'));
  }

  terminate() {
    try { this.worker.terminate(); } catch (_) {}
  }
}

const workers: PooledWorker[] = [];
const queue: Job[] = [];

const dispatch = () => {
  // find idle worker
  let w = workers.find(x => !x.busy);
  if (!w && workers.length < MAX_WORKERS) {
    // create new
    w = new PooledWorker(true);
    workers.push(w);
  }
  if (!w) return;
  const job = queue.shift();
  if (!job) return;
  w.post(job);
};

export const runJob = (json: any, options: any = {}, timeoutMs = 30000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      reject(new Error('Worker timeout'));
    }, timeoutMs);
    queue.push({ id, json, options, resolve, reject, timeout });
    dispatch();
  });
};

export const shutdown = () => {
  for (const w of workers) w.terminate();
};
