import { pathToFileURL } from 'node:url';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';

const originalExec = childProcess.exec;

childProcess.exec = function patchedExec(command, ...args) {
  try {
    return originalExec.call(this, command, ...args);
  } catch (error) {
    if (
      process.platform === 'win32' &&
      command === 'net use' &&
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'EPERM'
    ) {
      const callback = args.find((value) => typeof value === 'function');

      if (callback) {
        queueMicrotask(() => callback(null, '', ''));
      }

      return {
        kill() {},
      };
    }

    throw error;
  }
};

syncBuiltinESMExports();

process.argv = ['node', 'vite', ...process.argv.slice(2)];

const viteCliPath = path.resolve('node_modules/vite/bin/vite.js');

await import(pathToFileURL(viteCliPath).href);
