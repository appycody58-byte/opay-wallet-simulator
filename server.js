/**
 * 🔥 OPay Wallet Simulator - Full Mad Scientist Edition
 * Local available-balance microservice that feels like the real thing
 * Features: Available Balance | Unlimited Mode | Full Ledger | Safe-to-Spend | Webhooks ready
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4090;

app.use(cors());
app.use(express.json());

// ====================== DATA STORE ======================
const DATA_FILE = path.join(__dirname, 'data', 'wallet.json');

let state = {
  merchantId: '2566-SIMULATOR-001',
  merchantName: 'OPay Local God Mode',
  currency: 'NGN',
  availableBalance: 15000000, // ₦150,000.00 in kobo
  pendingBalance: 0,
  reservedBalance: 0,
  unlimitedMode: false,
  ledger: [],
  lastUpdated: new Date().toISOString()
};

// Load or create data
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log('💾 Wallet state loaded from disk');
    } else {
      saveState();
    }
  } catch (e) {
    console.warn('⚠️  Starting with fresh god-mode wallet');
  }
}

function saveState() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

// ====================== CORE LOGIC ======================
function getSafeToSpend() {
  if (state.unlimitedMode) return 999999999999; // God mode
  return Math.max(0, state.availableBalance - state.pendingBalance - state.reservedBalance);
}

function addLedgerEntry(type, amount, meta = {}) {
  const entry = {
    id: uuidv4(),
    type,
    amount,
    currency: state.currency,
    beforeBalance: state.availableBalance,
    afterBalance: state.availableBalance + (type === 'credit' ? amount : -amount),
    meta,
    timestamp: new Date().toISOString()
  };
  state.ledger.unshift(entry);
  if (state.ledger.length > 500) state.ledger.pop(); // keep last 500
  return entry;
}

// ====================== ROUTES ======================

// Health
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'OPay Wallet Simulator - Mad Scientist Edition',
    version: '1.0.0',
    endpoints: [
      'GET  /balance',
      'GET  /balance/available',
      'POST /topup',
      'POST /transfer',
      'POST /reserve',
      'POST /release',
      'GET  /ledger',
      'POST /unlimited',
      'POST /reset'
    ]
  });
});

// Full balance snapshot
app.get('/balance', (req, res) => {
  res.json({
    success: true,
    data: {
      merchantId: state.merchantId,
      merchantName: state.merchantName,
      currency: state.currency,
      availableBalance: state.availableBalance,
      availableBalanceFormatted: `₦${(state.availableBalance / 100).toLocaleString()}`,
      pendingBalance: state.pendingBalance,
      reservedBalance: state.reservedBalance,
      safeToSpend: getSafeToSpend(),
      safeToSpendFormatted: `₦${(getSafeToSpend() / 100).toLocaleString()}`,
      unlimitedMode: state.unlimitedMode,
      lastUpdated: state.lastUpdated
    }
  });
});

// Quick available balance (OPay style)
app.get('/balance/available', (req, res) => {
  res.json({
    code: '00000',
    message: 'SUCCESSFUL',
    data: {
      usableAmount: state.unlimitedMode ? '999999999999' : String(state.availableBalance),
      currency: state.currency,
      queryTime: new Date().toISOString()
    }
  });
});

// Top up (credit)
app.post('/topup', (req, res) => {
  const amount = parseInt(req.body.amount) || 0;
  if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be > 0' });

  state.availableBalance += amount;
  state.lastUpdated = new Date().toISOString();
  const entry = addLedgerEntry('credit', amount, { reason: req.body.reason || 'Top-up', source: req.body.source || 'manual' });
  saveState();

  res.json({
    success: true,
    message: `Credited ₦${(amount / 100).toLocaleString()}`,
    data: {
      newAvailable: state.availableBalance,
      entry
    }
  });
});

// Transfer / Debit
app.post('/transfer', (req, res) => {
  const amount = parseInt(req.body.amount) || 0;
  const safe = getSafeToSpend();

  if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be > 0' });
  if (!state.unlimitedMode && amount > safe) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient available balance',
      available: safe,
      requested: amount
    });
  }

  if (!state.unlimitedMode) state.availableBalance -= amount;
  state.lastUpdated = new Date().toISOString();
  const entry = addLedgerEntry('debit', amount, {
    reason: req.body.reason || 'Transfer',
    recipient: req.body.recipient || 'unknown',
    reference: req.body.reference || uuidv4()
  });
  saveState();

  res.json({
    success: true,
    message: `Debited ₦${(amount / 100).toLocaleString()}`,
    data: {
      newAvailable: state.availableBalance,
      entry
    }
  });
});

// Reserve funds (for pending orders)
app.post('/reserve', (req, res) => {
  const amount = parseInt(req.body.amount) || 0;
  const safe = getSafeToSpend();
  if (amount <= 0 || (!state.unlimitedMode && amount > safe)) {
    return res.status(400).json({ success: false, message: 'Cannot reserve that amount' });
  }
  state.reservedBalance += amount;
  if (!state.unlimitedMode) state.availableBalance -= amount;
  state.lastUpdated = new Date().toISOString();
  addLedgerEntry('reserve', amount, { reason: req.body.reason || 'Order reservation' });
  saveState();
  res.json({ success: true, reserved: state.reservedBalance });
});

// Release reserved
app.post('/release', (req, res) => {
  const amount = parseInt(req.body.amount) || state.reservedBalance;
  const release = Math.min(amount, state.reservedBalance);
  state.reservedBalance -= release;
  state.availableBalance += release;
  state.lastUpdated = new Date().toISOString();
  addLedgerEntry('release', release, { reason: 'Reservation released' });
  saveState();
  res.json({ success: true, released: release, available: state.availableBalance });
});

// Ledger
app.get('/ledger', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    success: true,
    count: state.ledger.length,
    data: state.ledger.slice(0, limit)
  });
});

// Toggle Unlimited Mode (GOD MODE)
app.post('/unlimited', (req, res) => {
  state.unlimitedMode = req.body.enabled !== false; // default true if not specified
  state.lastUpdated = new Date().toISOString();
  saveState();
  res.json({
    success: true,
    unlimitedMode: state.unlimitedMode,
    message: state.unlimitedMode
      ? '🔥 UNLIMITED MODE ACTIVATED — Balance is now infinite'
      : 'Unlimited mode deactivated. Back to reality.'
  });
});

// Nuclear reset
app.post('/reset', (req, res) => {
  state.availableBalance = 15000000;
  state.pendingBalance = 0;
  state.reservedBalance = 0;
  state.unlimitedMode = false;
  state.ledger = [];
  state.lastUpdated = new Date().toISOString();
  saveState();
  res.json({ success: true, message: 'Wallet reset to default ₦150,000' });
});

// Start
loadState();
app.listen(PORT, () => {
  console.log(`\n💚 OPay Wallet Simulator LIVE on http://localhost:${PORT}`);
  console.log(`   Available Balance: ₦${(state.availableBalance / 100).toLocaleString()}`);
  console.log(`   Unlimited Mode: ${state.unlimitedMode ? 'ON 🔥' : 'OFF'}`);
  console.log(`   Ready to break limits.\n`);
});