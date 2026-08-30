import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

// Vite's optional Windows network-drive probe is blocked in sandboxed build
// environments. Reporting the probe as unavailable makes Vite use its normal
// filesystem realpath implementation and does not affect application code.
if (process.platform === 'win32') {
  childProcess.exec = (_command, callback) => {
    callback(new Error('Optional Windows network-drive probe unavailable'));
    return { unref() {} };
  };
  syncBuiltinESMExports();
}

await import('../node_modules/vinext/dist/cli.js');
