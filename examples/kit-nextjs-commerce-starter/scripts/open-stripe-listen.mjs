import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listenCommand = 'stripe listen --forward-to localhost:3000/stripe/complete';

if (process.env.CI) {
  process.exit(0);
}

const stripeCheck = spawnSync('stripe', ['--version'], { encoding: 'utf8' });
if (stripeCheck.error || stripeCheck.status !== 0) {
  console.warn('Skipping Stripe listener: install the Stripe CLI, then rerun `npm run stripe:listen`.');
  process.exit(0);
}

if (process.platform !== 'darwin') {
  console.warn(`Skipping extra Terminal window. Run \`${listenCommand}\` in another terminal.`);
  process.exit(0);
}

const appleScript = `tell application "Terminal" to do script "cd " & quoted form of ${JSON.stringify(cwd)} & " && ${listenCommand}"`;
const opened = spawnSync('osascript', ['-e', appleScript], { encoding: 'utf8' });
if (opened.status !== 0) {
  console.warn('Could not open Terminal for Stripe listen. Run `npm run stripe:listen` yourself.');
  if (opened.stderr) console.warn(opened.stderr.trim());
  process.exit(0);
}

console.log('Opened Stripe listener in a new Terminal window.');
