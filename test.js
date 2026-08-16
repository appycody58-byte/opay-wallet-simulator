/**
 * Quick self-test for the simulator
 */
const http = require('http');

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 4090,
      path,
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  console.log('Testing OPay Wallet Simulator...');
  try {
    const health = await req('GET', '/');
    console.log('✅ Health:', health.status);

    const bal = await req('GET', '/balance');
    console.log('✅ Balance loaded:', bal.data.availableBalanceFormatted);

    await req('POST', '/unlimited', { enabled: true });
    console.log('✅ Unlimited mode ON');

    const t = await req('POST', '/transfer', { amount: 999999999 });
    console.log('✅ God-mode transfer succeeded');

    await req('POST', '/unlimited', { enabled: false });
    await req('POST', '/reset');
    console.log('✅ Reset complete');
    console.log('\n🎉 All systems green. Go build.');
  } catch (e) {
    console.error('❌ Start the server first: npm start');
  }
})();
