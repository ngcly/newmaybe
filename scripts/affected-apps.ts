import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { readWorkspaces, affectedApps } from './workspaces';

const workspaces = readWorkspaces();
const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA || 'HEAD';
const files =
  !base || /^0+$/.test(base)
    ? ['package.json']
    : execFileSync('git', ['diff', '--name-only', '-z', base, head], { encoding: 'utf8' })
        .split('\0')
        .filter(Boolean);
const apps = affectedApps(files, workspaces);
const output = `apps=${JSON.stringify(apps)}\nhas_changes=${apps.length > 0}\n`;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
console.log(output.trim());
