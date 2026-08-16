# 💚 OPay Wallet Simulator v1.2

**Real frontend UI • Realistic transfers • Webhooks • Multi-merchant • Full audit logging**

This feels like a real OPay wallet. You can top up, transfer money, see the balance update live, and get webhooks — all running locally on your machine.

---

## 🚀 How to Install & Try It RIGHT NOW

### 1. Clone & Install
```bash
git clone https://github.com/appycody58-byte/opay-wallet-simulator.git
cd opay-wallet-simulator
npm install
```

### 2. Start the server
```bash
npm start
```

You will see:
```
💚 OPay Wallet Simulator v1.2 LIVE
   Frontend UI  → http://localhost:4090
   API          → http://localhost:4090/api
```

### 3. Open the Frontend
Open your browser and go to:

**http://localhost:4090**

You now have a beautiful dark UI where you can:
- See live Available Balance
- Top Up money
- Transfer money (it works exactly like normal)
- Toggle Unlimited Mode
- View recent activity + full Audit Log

### 4. Try a Transfer (feels normal)
1. Click **Transfer**
2. Enter amount in Naira (e.g. `1500`)
3. Enter recipient name
4. Confirm

Balance updates instantly. Transaction appears in the activity feed. Everything is audited.

---

## Extra Powers

### Set a Webhook
```bash
curl -X POST http://localhost:4090/webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-server.com/opay-hook"}'
```
Every successful transfer / topup will POST to your URL.

### CLI still works
```bash
node cli.js balance
node cli.js transfer 250000     # ₦2,500
node cli.js audit 20
node cli.js unlimited on
```

### Multi-merchant
The system already supports multiple merchants (ready for expansion). Default merchant ID: `2566-SIMULATOR-001`

---

## What you can do right now

| Action              | How                                      |
|---------------------|------------------------------------------|
| See balance         | Open http://localhost:4090               |
| Top up              | Click “+ Top Up” in the UI               |
| Transfer money      | Click “Transfer” — works like real OPay  |
| Unlimited money     | Click the Unlimited button               |
| View audit trail    | Click “Audit Log”                        |
| Use as API          | `POST /transfer` with amount in kobo     |

---

**This is ready to use today.**  
Clone → `npm install` → `npm start` → open browser → transfer money like normal.

Built by AppyCody × Grok 💚🔥
