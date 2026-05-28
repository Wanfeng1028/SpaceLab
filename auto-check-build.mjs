import { execSync } from 'node:child_process';

function ts() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function check() {
  console.log(`[${ts()}] === 开始构建检查 ===`);
  try {
    execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
    console.log(`[${ts()}] ✅ 构建通过，无错误`);
  } catch (e) {
    console.log(`[${ts()}] ❌ 构建失败！`);
    const output = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    for (const line of output.split('\n')) {
      if (/ERROR/i.test(line)) {
        console.log(`[${ts()}] ${line.trim()}`);
      }
    }
  }
  console.log(`[${ts()}] 下次检查: 5分钟后`);
}

check();
setInterval(check, 5 * 60 * 1000);
