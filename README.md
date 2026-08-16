# 💚 OPay Wallet Simulator v1.3

**Real frontend • PIN protection • Nigerian banks • Transaction receipts • Webhooks • Audit logging**

This now feels very close to a real OPay experience.

---

## 🚀 Install & Run RIGHT NOW

```bash
git clone https://github.com/appycody58-byte/opay-wallet-simulator.git
cd opay-wallet-simulator
npm install
npm start
```

Then open your browser:

**→ http://localhost:4090**

---

## What’s New in v1.3

- **PIN Protection** (default PIN: `1234`)
- **Nigerian Bank List** when transferring (Access, GTBank, Zenith, OPay, Kuda, etc.)
- **Beautiful Transaction Receipt** after every successful top-up or transfer
- More realistic transfer flow (Bank + Account Number + Recipient Name)
- Still has: Unlimited Mode, Full Audit Log, Webhooks, Multi-merchant foundation

---

## How to Use

1. Open http://localhost:4090
2. Click **Transfer** or **Top Up**
3. Enter the default PIN: **1234**
4. Fill the form (for transfer: choose bank, account, name, amount)
5. Confirm → you get a clean receipt
6. Balance updates instantly

### Default PIN
`1234` (stored only in browser session for this demo)

### Useful Commands
```bash
node cli.js balance
node cli.js transfer 250000
node cli.js unlimited on
node cli.js audit 20
```

---

**You can transfer money right now and it behaves like a normal OPay transfer.**

Enjoy. 💚🔥
