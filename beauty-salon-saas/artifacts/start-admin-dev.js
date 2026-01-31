const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const artifacts = 'C:\\Users\\Nicita\\beauty-salon-saas\\artifacts';
const outLog = path.join(artifacts, 'admin-panel-dev.out.log');
const errLog = path.join(artifacts, 'admin-panel-dev.err.log');
const pidFile = path.join(artifacts, 'admin-panel-dev.pid');
const cwd = 'C:\\Users\\Nicita\\beauty-salon-saas\\apps\\admin-panel';
const nodeExe = 'C:\\Program Files\\nodejs\\node.exe';
const npmCli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
const out = fs.openSync(outLog, 'a');
const err = fs.openSync(errLog, 'a');
const child = spawn(nodeExe, [npmCli, 'run','dev','--','--hostname','127.0.0.1','--port','4000'], {
  cwd,
  env: { ...process.env, NEXT_IGNORE_INCORRECT_LOCKFILE: '1' },
  detached: true,
  stdio: ['ignore', out, err],
  windowsHide: true,
});
fs.writeFileSync(pidFile, String(child.pid));
child.unref();
console.log('Spawned dev server PID ' + child.pid);
