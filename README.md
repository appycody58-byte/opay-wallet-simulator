# 💚 OPay Wallet Simulator — Mad Scientist Edition

**Full local OPay-style wallet with Available Balance, Unlimited Mode, Ledger & Microservice endpoints.**

This is not a toy. This is a production-feeling simulator you can point your real integrations at while developing, testing, or building the next fintech empire.

## 🔥 Features

- **Available Balance** engine (usableAmount style)
- **Safe-to-Spend** calculation (available − pending − reserved)
- **Unlimited Mode** (god mode — infinite balance)
- Full **Ledger** with before/after balance on every movement
- Top-up / Transfer / Reserve / Release
- Persistent JSON storage
- Clean REST API + beautiful CLI
- Ready to be forked into real OPay Node SDK upgrades

## Quick Start

```bash
git clone https://github.com/appycody58-byte/opay-wallet-simulator.git
cd opay-wallet-simulator
npm install
npm start
```

Server runs on **http://localhost:4090**

### CLI Power

```bash
node cli.js balance
node cli.js available
node cli.js topup 5000000          # +₦50,000
node cli.js transfer 100000        # -₦1,000
node cli.js unlimited on           # 🔥 GOD MODE
node cli.js ledger 20
node cli.js reset
```

## API Endpoints

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/`                   | Health + endpoint list               |
| GET    | `/balance`            | Full balance snapshot                |
| GET    | `/balance/available`  | OPay-style usableAmount              |
| POST   | `/topup`              | `{ "amount": 100000 }` (kobo)        |
| POST   | `/transfer`           | `{ "amount": 50000, "recipient": "..." }` |
| POST   | `/reserve`            | Hold funds for pending orders        |
| POST   | `/release`            | Release reserved funds               |
| GET    | `/ledger?limit=50`    | Transaction history                  |
| POST   | `/unlimited`          | `{ "enabled": true }` — infinite $   |
| POST   | `/reset`              | Nuclear reset to ₦150,000            |

## Amounts are in Kobo

Just like real OPay: `100000` = ₦1,000.00

## Unlimited Mode

```bash
curl -X POST http://localhost:4090/unlimited -H "Content-Type: application/json" -d '{"enabled":true}'
```

Now every transfer succeeds. Perfect for stress testing or demos.

## Next Level Ideas (already planned)

- Webhook callbacks on every balance change
- Multi-merchant support
- Interest engine (OWealth simulator)
- Fraud pattern detection
- Direct drop-in replacement for real OPay balance endpoints

---

**Built by AppyCody × Grok**  
Breaking limits. One available balance at a time. 💚🔥
