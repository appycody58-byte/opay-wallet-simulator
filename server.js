/**
 * 🔥 OPay Wallet Simulator v1.2 — Real Frontend + Webhooks + Multi-Merchant ready
 * Transfers feel normal. Full audit. Ready to use right now.
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 4090;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve frontend

// ====================== DATA ======================
const DATA_FILE = path.join(__dirname, 'data', 'wallet.json');
const AUDIT_FILE = path.join(__dirname, 'data', 'audit.log.json');

let state = {
  merchants: {
    '2566-SIMULATOR-001': {
      merchantId: '2566-SIMULATOR-001',
      merchantName: 'OPay Local God Mode',
      currency: 'NGN',
      availableBalance: 15000000,
      pendingBalance: 0,
      reservedBalance: 0,
      unlimitedMode: false,
      ledger: [],
      webhookUrl: null,
      lastUpdated: new Date().toISOString()
    }
  },
  defaultMerchant: '2566-SIMULATOR-001'
};

let auditLog = [];

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // migrate old single-wallet format if needed
      if (raw.availableBalance !== undefined) {
        state.merchants['2566-SIMULATOR-001'] = {
          ...raw,
          webhookUrl: raw.webhookUrl || null
        };
      } else {
        state = raw;
      }
      console.log('💾 State loaded');
    } else saveState();
  } catch (e) { console.warn('Fresh start'); }

  try {
    if (fs.existsSync(AUDIT_FILE)) {
      auditLog = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    }
  } catch (e) { auditLog = []; }
}

function saveState() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function saveAudit() {
  const dir = path.dirname(AUDIT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (auditLog.length > 2000) auditLog = auditLog.slice(0, 2000);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLog, null, 2));
}

function getMerchant(id) {
  return state.merchants[id || state.defaultMerchant];
}

// ====================== WEBHOOK ======================
function fireWebhook(merchant, event, payload) {
  if (!merchant.webhookUrl) return;
  const body = JSON.stringify({
    event,
    merchantId: merchant.merchantId,
    timestamp: new Date().toISOString(),
    data: payload
  });
  try {
    const url = new URL(merchant.webhookUrl);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-OPay-Simulator': 'true'
      }
    }, res => {
      // fire and forget
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch (e) {}
}

// ====================== AUDIT ======================
function audit(action, options = {}) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    success: options.success !== false,
    amount: options.amount ?? null,
    currency: 'NGN',
    beforeBalance: options.beforeBalance ?? null,
    afterBalance: options.afterBalance ?? null,
    delta: (options.afterBalance ?? 0) - (options.beforeBalance ?? 0),
    reason: options.reason || null,
    actor: options.actor || 'system',
    ip: options.ip || null,
    userAgent: options.userAgent || null,
    reference: options.reference || uuidv4(),
    merchantId: options.merchantId || state.defaultMerchant,
    unlimitedModeAtTime: options.unlimitedModeAtTime ?? false,
    errorMessage: options.errorMessage || null,
    ...options.extra
  };
  auditLog.unshift(entry);
  saveAudit();
  return entry;
}

function getRequestContext(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    actor: req.headers['x-actor'] || req.body?.actor || 'api-client'
  };
}

// ====================== CORE ======================
function getSafeToSpend(m) {
  if (m.unlimitedMode) return 999999999999;
  return Math.max(0, m.availableBalance - m.pendingBalance - m.reservedBalance);
}

function addLedger(m, type, amount, meta = {}) {
  const entry = {
    id: uuidv4(),
    type,
    amount,
    currency: m.currency,
    beforeBalance: m.availableBalance,
    afterBalance: m.availableBalance + (['credit', 'release'].includes(type) ? amount : -amount),
    meta,
    timestamp: new Date().toISOString()
  };
  m.ledger.unshift(entry);
  if (m.ledger.length > 500) m.ledger.pop();
  return entry;
}

// ====================== ROUTES ======================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '1.2.0',
    features: ['Frontend UI', 'Webhooks', 'Multi-Merchant', 'Audit Logging', 'Realistic Transfers'],
    endpoints: ['/balance', '/transfer', '/topup', '/audit', '/webhook', '/merchants']
  });
});

// Balance
app.get('/balance', (req, res) => {
  const m = getMerchant(req.query.merchantId);
  const ctx = getRequestContext(req);
  audit('BALANCE_QUERY', { success: true, actor: ctx.actor, ip: ctx.ip, merchantId: m.merchantId, unlimitedModeAtTime: m.unlimitedMode });

  res.json({
    success: true,
    data: {
      merchantId: m.merchantId,
      merchantName: m.merchantName,
      currency: m.currency,
      availableBalance: m.availableBalance,
      availableBalanceFormatted: `₦${(m.availableBalance / 100).toLocaleString()}`,
      pendingBalance: m.pendingBalance,
      reservedBalance: m.reservedBalance,
      safeToSpend: getSafeToSpend(m),
      safeToSpendFormatted: `₦${(getSafeToSpend(m) / 100).toLocaleString()}`,
      unlimitedMode: m.unlimitedMode,
      lastUpdated: m.lastUpdated
    }
  });
});

app.get('/balance/available', (req, res) => {
  const m = getMerchant(req.query.merchantId);
  res.json({
    code: '00000',
    message: 'SUCCESSFUL',
    data: {
      usableAmount: m.unlimitedMode ? '999999999999' : String(m.availableBalance),
      currency: m.currency,
      queryTime: new Date().toISOString()
    }
  });
});

// Top Up
app.post('/topup', (req, res) => {
  const m = getMerchant(req.body.merchantId);
  const ctx = getRequestContext(req);
  const amount = parseInt(req.body.amount) || 0;
  const before = m.availableBalance;

  if (amount <= 0) {
    audit('TOPUP', { success: false, amount, beforeBalance: before, afterBalance: before, actor: ctx.actor, ip: ctx.ip, errorMessage: 'Amount must be > 0', merchantId: m.merchantId });
    return res.status(400).json({ success: false, message: 'Amount must be > 0' });
  }

  m.availableBalance += amount;
  m.lastUpdated = new Date().toISOString();
  const entry = addLedger(m, 'credit', amount, { reason: req.body.reason || 'Top-up' });
  saveState();

  audit('TOPUP', { success: true, amount, beforeBalance: before, afterBalance: m.availableBalance, reason: req.body.reason, actor: ctx.actor, ip: ctx.ip, merchantId: m.merchantId, unlimitedModeAtTime: m.unlimitedMode });
  fireWebhook(m, 'topup.success', { amount, newBalance: m.availableBalance, entry });

  res.json({ success: true, message: `Credited ₦${(amount / 100).toLocaleString()}`, data: { newAvailable: m.availableBalance, entry } });
});

// Transfer (feels normal)
app.post('/transfer', (req, res) => {
  const m = getMerchant(req.body.merchantId);
  const ctx = getRequestContext(req);
  const amount = parseInt(req.body.amount) || 0;
  const safe = getSafeToSpend(m);
  const before = m.availableBalance;
  const reference = req.body.reference || `TRF-${Date.now()}`;

  if (amount <= 0) {
    audit('TRANSFER', { success: false, amount, beforeBalance: before, afterBalance: before, actor: ctx.actor, ip: ctx.ip, reference, errorMessage: 'Amount must be > 0', merchantId: m.merchantId });
    return res.status(400).json({ success: false, message: 'Amount must be > 0' });
  }

  if (!m.unlimitedMode && amount > safe) {
    audit('TRANSFER', { success: false, amount, beforeBalance: before, afterBalance: before, actor: ctx.actor, ip: ctx.ip, reference, errorMessage: 'Insufficient available balance', merchantId: m.merchantId });
    fireWebhook(m, 'transfer.failed', { amount, reason: 'Insufficient balance' });
    return res.status(400).json({ success: false, message: 'Insufficient available balance', available: safe, requested: amount });
  }

  if (!m.unlimitedMode) m.availableBalance -= amount;
  m.lastUpdated = new Date().toISOString();
  const entry = addLedger(m, 'debit', amount, {
    reason: req.body.reason || 'Transfer',
    recipient: req.body.recipient || 'unknown',
    reference
  });
  saveState();

  audit('TRANSFER', {
    success: true, amount, beforeBalance: before, afterBalance: m.availableBalance,
    reason: req.body.reason, actor: ctx.actor, ip: ctx.ip, reference,
    merchantId: m.merchantId, unlimitedModeAtTime: m.unlimitedMode,
    extra: { recipient: req.body.recipient || 'unknown' }
  });

  fireWebhook(m, 'transfer.success', {
    amount,
    recipient: req.body.recipient,
    reference,
    newBalance: m.availableBalance,
    entry
  });

  res.json({
    success: true,
    message: `Transfer of ₦${(amount / 100).toLocaleString()} successful`,
    data: {
      reference,
      newAvailable: m.availableBalance,
      newAvailableFormatted: `₦${(m.availableBalance / 100).toLocaleString()}`,
      entry
    }
  });
});

// Webhook management
app.post('/webhook', (req, res) => {
  const m = getMerchant(req.body.merchantId);
  m.webhookUrl = req.body.url || null;
  saveState();
  res.json({ success: true, message: m.webhookUrl ? `Webhook set to ${m.webhookUrl}` : 'Webhook cleared', webhookUrl: m.webhookUrl });
});

app.get('/webhook', (req, res) => {
  const m = getMerchant(req.query.merchantId);
  res.json({ success: true, webhookUrl: m.webhookUrl });
});

// Unlimited
app.post('/unlimited', (req, res) => {
  const m = getMerchant(req.body.merchantId);
  const ctx = getRequestContext(req);
  m.unlimitedMode = req.body.enabled !== false;
  m.lastUpdated = new Date().toISOString();
  saveState();
  audit(m.unlimitedMode ? 'UNLIMITED_ON' : 'UNLIMITED_OFF', { success: true, actor: ctx.actor, ip: ctx.ip, merchantId: m.merchantId });
  res.json({
    success: true,
    unlimitedMode: m.unlimitedMode,
    message: m.unlimitedMode ? '🔥 UNLIMITED MODE ON' : 'Unlimited mode OFF'
  });
});

// Ledger & Audit
app.get('/ledger', (req, res) => {
  const m = getMerchant(req.query.merchantId);
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, count: m.ledger.length, data: m.ledger.slice(0, limit) });
});

app.get('/audit', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  let filtered = auditLog;
  if (req.query.action) filtered = filtered.filter(e => e.action === req.query.action.toUpperCase());
  if (req.query.success === 'true') filtered = filtered.filter(e => e.success);
  if (req.query.success === 'false') filtered = filtered.filter(e => !e.success);
  res.json({ success: true, totalAuditEntries: auditLog.length, returned: Math.min(limit, filtered.length), data: filtered.slice(0, limit) });
});

// Reset
app.post('/reset', (req, res) => {
  const m = getMerchant(req.body.merchantId);
  const ctx = getRequestContext(req);
  const before = m.availableBalance;
  m.availableBalance = 15000000;
  m.pendingBalance = 0;
  m.reservedBalance = 0;
  m.unlimitedMode = false;
  m.ledger = [];
  m.lastUpdated = new Date().toISOString();
  saveState();
  audit('RESET', { success: true, beforeBalance: before, afterBalance: m.availableBalance, actor: ctx.actor, ip: ctx.ip, merchantId: m.merchantId });
  res.json({ success: true, message: 'Reset to ₦150,000' });
});

// Multi-merchant list
app.get('/merchants', (req, res) => {
  res.json({
    success: true,
    data: Object.values(state.merchants).map(m => ({
      merchantId: m.merchantId,
      merchantName: m.merchantName,
      availableBalanceFormatted: `₦${(m.availableBalance / 100).toLocaleString()}`,
      unlimitedMode: m.unlimitedMode
    }))
  });
});

// Start
loadState();
app.listen(PORT, () => {
  console.log(`\n💚 OPay Wallet Simulator v1.2 LIVE`);
  console.log(`   Frontend UI  → http://localhost:${PORT}`);
  console.log(`   API          → http://localhost:${PORT}/api`);
  console.log(`   Ready for real transfers + webhooks + multi-merchant\n`);
});
