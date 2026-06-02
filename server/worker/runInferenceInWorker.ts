import { runJob } from './pool';

export const runInferenceInWorker = (json: any, options: any = {}, timeout = 30000): Promise<any> => {
  return runJob(json, options, timeout);
};
