import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
const args = process.argv.slice(2);

const tauriExecutable = process.platform === 'win32'
  ? path.join(projectRoot, 'node_modules', '.bin', 'tauri.cmd')
  : path.join(projectRoot, 'node_modules', '.bin', 'tauri');

if (!fs.existsSync(tauriExecutable)) {
  console.error(`未找到 Tauri CLI: ${tauriExecutable}`);
  process.exit(1);
}

const runChild = (command, commandArgs, options = {}) => {
  const child = spawn(command, commandArgs, {
    stdio: 'inherit',
    cwd: projectRoot,
    ...options
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
};

if (process.platform !== 'win32') {
  runChild(tauriExecutable, args);
} else {
  const windowsRunner = path.join(projectRoot, 'scripts', 'run-tauri-win.cmd');

  if (!fs.existsSync(windowsRunner)) {
    console.error(`未找到 Windows 启动脚本: ${windowsRunner}`);
    process.exit(1);
  }

  runChild(windowsRunner, args, { shell: true });
}
