#!/usr/bin/env node
/**
 * ⚡ OPay Wallet CLI - Instant balance control from terminal
 */
const http = require('http');
const chalk = require('chalk');

const BASE = process.env.OPAY_SIM_URL || 'http://localhost:4090';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const [,, cmd, ...args] = process.argv;

  if (!cmd || cmd === 'help') {
    console.log(chalk.green(`
OPay Wallet Simulator CLI

  balance          Show full balance
  available        Quick available balance
  topup <kobo>     Credit wallet
  transfer <kobo>  Debit wallet
  unlimited on|off Toggle god mode
  ledger [n]       Show last n entries
  reset            Nuclear reset
    `));
    return;
  }

  try {
    if (cmd === 'balance') {
      const r = await request('GET', '/balance');
      console.log(chalk.cyan('\n💰 BALANCE SNAPSHOT'));
      console.log(JSON.stringify(r.data, null, 2));
    } else if (cmd === 'available') {
      const r = await request('GET', '/balance/available');
      console.log(chalk.green(`\nAvailable: ₦${(Number(r.data.usableAmount)/100).toLocaleString()}`));
    } else if (cmd === 'topup') {
      const amount = parseInt(args[0]);
      const r = await request('POST', '/topup', { amount, reason: 'CLI topup' });
      console.log(chalk.green(r.message));
    } else if (cmd === 'transfer') {
      const amount = parseInt(args[0]);
      const r = await request('POST', '/transfer', { amount, reason: 'CLI transfer' });
      console.log(r.success ? chalk.green(r.message) : chalk.red(r.message));
    } else if (cmd === 'unlimited') {
      const enabled = args[0] !== 'off';
      const r = await request('POST', '/unlimited', { enabled });
      console.log(chalk.magenta(r.message));
    } else if (cmd === 'ledger') {
      const r = await request('GET', `/ledger?limit=${args[0] || 10}`);
      console.log(JSON.stringify(r.data, null, 2));
    } else if (cmd === 'reset') {
      const r = await request('POST', '/reset');
      console.log(chalk.yellow(r.message));
    } else {
      console.log(chalk.red('Unknown command. Run with no args for help.'));
    }
  } catch (e) {
    console.error(chalk.red('Server not running? Start with: npm start'));
    console.error(e.message);
  }
}

main();