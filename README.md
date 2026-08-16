# 💚 OPay Wallet Simulator — Mad Scientist Edition

**Full local OPay-style wallet with Available Balance + 🛡️ Production-grade Transaction Audit Logging**

This is not a toy. This is a production-feeling simulator you can point your real integrations at while developing, testing, or building the next fintech empire.

## 🔥 Features

- **Available Balance** engine (usableAmount style)
- **Safe-to-Spend** calculation (available − pending − reserved)
- **Unlimited Mode** (god mode — infinite balance)
- Full **Ledger** with before/after balance on every movement
- **🛡️ Transaction Audit Logging** (the new power):
  - Immutable-style append-only audit trail
  - Logs **every** action (success + failure)
  - Rich context: actor, IP, user-agent, reference, before/after, delta, reason
  - Separate persistent `audit.log.json`
  - Filterable `/audit` endpoint
- Top-up / Transfer / Reserve / Release
- Persistent JSON storage
- Clean REST API + powerful CLI

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
node cli.js audit 30               # Full audit trail
node cli.js audit failed           # Only failed attempts
node cli.js reset
```

## API Endpoints

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/`                   | Health + endpoint list               |
| GET    | `/balance`            | Full balance snapshot (+ audited)    |
| GET    | `/balance/available`  | OPay-style usableAmount (+ audited)  |
| POST   | `/topup`              | Credit (audited)                     |
| POST   | `/transfer`           | Debit (audited — including failures) |
| POST   | `/reserve`            | Hold funds (audited)                 |
| POST   | `/release`            | Release reserved (audited)           |
| GET    | `/ledger`             | Business transaction history         |
| GET    | `/audit`              | **Full audit trail** (filterable)    |
| POST   | `/unlimited`          | Toggle god mode (audited)            |
| POST   | `/reset`              | Nuclear reset (audited)              |

### Audit Query Examples

```bash
# Last 100 audit entries
GET /audit?limit=100

# Only failed transfers
GET /audit?action=TRANSFER&success=false

# Only successful topups
GET /audit?action=TOPUP&success=true
```

## Amounts are in Kobo

Just like real OPay: `100000` = ₦1,000.00

## Unlimited Mode

```bash
curl -X POST http://localhost:4090/unlimited -H "Content-Type: application/json" -d '{"enabled":true}'
```

Now every transfer succeeds. Perfect for stress testing or demos. Every toggle is audited.

## Audit Log Structure (example)

```json
{
  "id": "uuid",
  "timestamp": "2026-08-16T...",
  "action": "TRANSFER",
  "success": false,
  "amount": 5000000,
  "beforeBalance": 15000000,
  "afterBalance": 15000000,
  "delta": 0,
  "reason": "Transfer",
  "actor": "api-client",
  "ip": "::1",
  "errorMessage": "Insufficient available balance",
  "reference": "..."
}
```

---

**Built by AppyCody × Grok**  
Breaking limits + full accountability. One available balance at a time. 💚🔥🛡️
