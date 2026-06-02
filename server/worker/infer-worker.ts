import { parentPort } from 'worker_threads';
import { inferSchema } from '../../src/lib/engine';

parentPort?.on('message', async (msg) => {
  const { id, json, options } = msg;
  try {
    const schema = inferSchema(json, undefined, 0, undefined, options);
    parentPort?.postMessage({ id, ok: true, schema });
  } catch (err) {
    parentPort?.postMessage({ id, ok: false, error: String(err) });
  }
});
