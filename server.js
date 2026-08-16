/**
 * 🔥 OPay Wallet Simulator - Full Mad Scientist Edition
 * + 🛡️ Transaction Audit Logging (immutable-style, full context, failed attempts)
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
const AUDIT_FILE = path.join(__dirname, 'data', 'audit.log.json');

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

let auditLog = []; // Separate, more detailed, append-only style audit trail

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

  try {
    if (fs.existsSync(AUDIT_FILE)) {
      auditLog = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
      console.log(`🛡️  Audit log loaded (${auditLog.length} entries)`);
    }
  } catch (e) {
    console.warn('⚠️  Starting with empty audit log');
    auditLog = [];
  }
}

function saveState() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function saveAudit() {
  const dir = path.dirname(AUDIT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Keep last 2000 audit entries to prevent infinite growth
  if (auditLog.length > 2000) auditLog = auditLog.slice(0, 2000);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLog, null, 2));
}

// ====================== AUDIT ENGINE ======================
/**
 * Creates a rich, immutable-style audit entry
 * Logs BOTH successful and failed operations
 */
function audit(action, options = {}) {
  const {
    success = true,
    amount = null,
    beforeBalance = state.availableBalance,
    afterBalance = state.availableBalance,
    reason = null,
    actor = 'system',
    ip = null,
    userAgent = null,
    reference = null,
    extra = {},
    errorMessage = null
  } = options;

  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,                    // e.g. 'TOPUP', 'TRANSFER', 'RESERVE', 'UNLIMITED_ON', 'BALANCE_QUERY'
    success,
    amount,
    currency: state.currency,
    beforeBalance,
    afterBalance,
    delta: afterBalance - beforeBalance,
    reason,
    actor,
    ip,
    userAgent,
    reference: reference || uuidv4(),
    merchantId: state.merchantId,
    unlimitedModeAtTime: state.unlimitedMode,
    errorMessage,
    ...extra
  };

  auditLog.unshift(entry); // newest first
  saveAudit();
  return entry;
}

// Helper to extract request context
function getRequestContext(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    actor: req.headers['x-actor'] || req.body?.actor || 'api-client'
  };
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
    afterBalance: state.availableBalance + (type === 'credit' || type === 'release' ? amount : -amount),
    meta,
    timestamp: new Date().toISOString()
  };
  state.ledger.unshift(entry);
  if (state.ledger.length > 500) state.ledger.pop();
  return entry;
}

// ====================== ROUTES ======================

// Health
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'OPay Wallet Simulator - Mad Scientist Edition',
    version: '1.1.0',
    features: ['Available Balance', 'Unlimited Mode', 'Ledger', 'Transaction Audit Logging'],
    endpoints: [
      'GET  /balance',
      'GET  /balance/available',
      'POST /topup',
      'POST /transfer',
      'POST /reserve',
      'POST /release',
      'GET  /ledger',
      'GET  /audit',
      'POST /unlimited',
      'POST /reset'
    ]
  });
});

// Full balance snapshot
app.get('/balance', (req, res) => {
  const ctx = getRequestContext(req);
  audit('BALANCE_QUERY', {
    success: true,
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    extra: { queryType: 'full' }
  });

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
  const ctx = getRequestContext(req);
  audit('BALANCE_QUERY', {
    success: true,
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    extra: { queryType: 'available' }
  });

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
  const ctx = getRequestContext(req);
  const amount = parseInt(req.body.amount) || 0;
  const before = state.availableBalance;

  if (amount <= 0) {
    audit('TOPUP', {
      success: false,
      amount,
      beforeBalance: before,
      afterBalance: before,
      reason: req.body.reason || 'Top-up',
      actor: ctx.actor,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      errorMessage: 'Amount must be > 0'
    });
    return res.status(400).json({ success: false, message: 'Amount must be > 0' });
  }

  state.availableBalance += amount;
  state.lastUpdated = new Date().toISOString();
  const entry = addLedgerEntry('credit', amount, { reason: req.body.reason || 'Top-up', source: req.body.source || 'manual' });
  saveState();

  audit('TOPUP', {
    success: true,
    amount,
    beforeBalance: before,
    afterBalance: state.availableBalance,
    reason: req.body.reason || 'Top-up',
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    reference: entry.id,
    extra: { source: req.body.source || 'manual' }
  });

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
  const ctx = getRequestContext(req);
  const amount = parseInt(req.body.amount) || 0;
  const safe = getSafeToSpend();
  const before = state.availableBalance;
  const reference = req.body.reference || uuidv4();

  if (amount <= 0) {
    audit('TRANSFER', {
      success: false,
      amount,
      beforeBalance: before,
      afterBalance: before,
      reason: req.body.reason || 'Transfer',
      actor: ctx.actor,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      reference,
      errorMessage: 'Amount must be > 0'
    });
    return res.status(400).json({ success: false, message: 'Amount must be > 0' });
  }

  if (!state.unlimitedMode && amount > safe) {
    audit('TRANSFER', {
      success: false,
      amount,
      beforeBalance: before,
      afterBalance: before,
      reason: req.body.reason || 'Transfer',
      actor: ctx.actor,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      reference,
      errorMessage: 'Insufficient available balance',
      extra: { available: safe, requested: amount }
    });
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
    reference
  });
  saveState();

  audit('TRANSFER', {
    success: true,
    amount,
    beforeBalance: before,
    afterBalance: state.availableBalance,
    reason: req.body.reason || 'Transfer',
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    reference,
    extra: { recipient: req.body.recipient || 'unknown' }
  });

  res.json({
    success: true,
    message: `Debited ₦${(amount / 100).toLocaleString()}`,
    data: {
      newAvailable: state.availableBalance,
      entry
    }
  });
});

// Reserve funds
app.post('/reserve', (req, res) => {
  const ctx = getRequestContext(req);
  const amount = parseInt(req.body.amount) || 0;
  const safe = getSafeToSpend();
  const before = state.availableBalance;

  if (amount <= 0 || (!state.unlimitedMode && amount > safe)) {
    audit('RESERVE', {
      success: false,
      amount,
      beforeBalance: before,
      afterBalance: before,
      reason: req.body.reason || 'Order reservation',
      actor: ctx.actor,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      errorMessage: 'Cannot reserve that amount'
    });
    return res.status(400).json({ success: false, message: 'Cannot reserve that amount' });
  }

  state.reservedBalance += amount;
  if (!state.unlimitedMode) state.availableBalance -= amount;
  state.lastUpdated = new Date().toISOString();
  addLedgerEntry('reserve', amount, { reason: req.body.reason || 'Order reservation' });
  saveState();

  audit('RESERVE', {
    success: true,
    amount,
    beforeBalance: before,
    afterBalance: state.availableBalance,
    reason: req.body.reason || 'Order reservation',
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent
  });

  res.json({ success: true, reserved: state.reservedBalance });
});

// Release reserved
app.post('/release', (req, res) => {
  const ctx = getRequestContext(req);
  const amount = parseInt(req.body.amount) || state.reservedBalance;
  const release = Math.min(amount, state.reservedBalance);
  const before = state.availableBalance;

  state.reservedBalance -= release;
  state.availableBalance += release;
  state.lastUpdated = new Date().toISOString();
  addLedgerEntry('release', release, { reason: 'Reservation released' });
  saveState();

  audit('RELEASE', {
    success: true,
    amount: release,
    beforeBalance: before,
    afterBalance: state.availableBalance,
    reason: 'Reservation released',
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent
  });

  res.json({ success: true, released: release, available: state.availableBalance });
});

// Ledger (business transactions)
app.get('/ledger', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    success: true,
    count: state.ledger.length,
    data: state.ledger.slice(0, limit)
  });
});

// 🛡️ AUDIT TRAIL (full accountability)
app.get('/audit', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const action = req.query.action; // optional filter
  const successOnly = req.query.success === 'true';
  const failedOnly = req.query.success === 'false';

  let filtered = auditLog;

  if (action) {
    filtered = filtered.filter(e => e.action === action.toUpperCase());
  }
  if (successOnly) {
    filtered = filtered.filter(e => e.success === true);
  }
  if (failedOnly) {
    filtered = filtered.filter(e => e.success === false);
  }

  res.json({
    success: true,
    totalAuditEntries: auditLog.length,
    returned: Math.min(limit, filtered.length),
    data: filtered.slice(0, limit)
  });
});

// Toggle Unlimited Mode
app.post('/unlimited', (req, res) => {
  const ctx = getRequestContext(req);
  const enabled = req.body.enabled !== false;
  const before = state.unlimitedMode;

  state.unlimitedMode = enabled;
  state.lastUpdated = new Date().toISOString();
  saveState();

  audit(enabled ? 'UNLIMITED_ON' : 'UNLIMITED_OFF', {
    success: true,
    beforeBalance: state.availableBalance,
    afterBalance: state.availableBalance,
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    extra: { previousState: before, newState: enabled }
  });

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
  const ctx = getRequestContext(req);
  const before = state.availableBalance;

  state.availableBalance = 15000000;
  state.pendingBalance = 0;
  state.reservedBalance = 0;
  state.unlimitedMode = false;
  state.ledger = [];
  state.lastUpdated = new Date().toISOString();
  saveState();

  audit('RESET', {
    success: true,
    beforeBalance: before,
    afterBalance: state.availableBalance,
    reason: 'Nuclear reset to default',
    actor: ctx.actor,
    ip: ctx.ip,
    userAgent: ctx.userAgent
  });

  res.json({ success: true, message: 'Wallet reset to default ₦150,000' });
});

// Start
loadState();
app.listen(PORT, () => {
  console.log(`\n💚 OPay Wallet Simulator LIVE on http://localhost:${PORT}`);
  console.log(`   Available Balance: ₦${(state.availableBalance / 100).toLocaleString()}`);
  console.log(`   Unlimited Mode: ${state.unlimitedMode ? 'ON 🔥' : 'OFF'}`);
  console.log(`   Audit Log Entries: ${auditLog.length}`);
  console.log(`   Ready to break limits + full accountability.\n`);
});
