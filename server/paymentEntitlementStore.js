import fs from 'node:fs';
import path from 'node:path';
import { getAdminFirestore } from './firebaseAdmin.js';

const PAYMENT_COLLECTION = 'premiumPaymentRecords';
const ENTITLEMENT_COLLECTION = 'premiumEntitlements';

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeUserId(value) {
  return String(value ?? '').trim();
}

function normalizeRecordId(value) {
  return String(value ?? '').trim();
}

function nowIso() {
  return new Date().toISOString();
}

class LocalPaymentEntitlementStore {
  constructor({ stateFile, production = false }) {
    this.stateFile = stateFile;
    this.production = production;
    this.mode = 'local';
    this.enabled = !production;
    this.state = this.loadState();
    this.writeInFlight = false;
    this.pendingWrite = false;
  }

  loadState() {
    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        payments: parsed.payments ?? {},
        entitlements: parsed.entitlements ?? {}
      };
    } catch {
      return {
        payments: {},
        entitlements: {}
      };
    }
  }

  async flush() {
    if (!this.enabled) {
      return;
    }

    if (this.writeInFlight) {
      this.pendingWrite = true;
      return;
    }

    this.writeInFlight = true;

    try {
      await fs.promises.mkdir(path.dirname(this.stateFile), { recursive: true });
      const tempFile = `${this.stateFile}.tmp`;
      await fs.promises.writeFile(tempFile, JSON.stringify(this.state, null, 2), 'utf8');
      await fs.promises.rename(tempFile, this.stateFile);
    } finally {
      this.writeInFlight = false;

      if (this.pendingWrite) {
        this.pendingWrite = false;
        void this.flush();
      }
    }
  }

  async savePaymentRecord(record) {
    if (!this.enabled) {
      throw new Error('Local payment storage is disabled in production.');
    }

    const recordId = normalizeRecordId(record.id || record.razorpayOrderId || record.razorpayPaymentId);
    const previous = this.state.payments[recordId] ?? {};
    const next = {
      ...previous,
      ...cloneValue(record),
      id: recordId,
      updatedAt: nowIso()
    };
    this.state.payments[recordId] = next;
    await this.flush();
    return cloneValue(next);
  }

  async getPaymentRecord(recordId) {
    return cloneValue(this.state.payments[normalizeRecordId(recordId)] ?? null);
  }

  async getPaymentByOrderId(orderId) {
    const normalizedOrderId = normalizeRecordId(orderId);
    return cloneValue(Object.values(this.state.payments).find((record) => record.razorpayOrderId === normalizedOrderId) ?? null);
  }

  async getPaymentByPaymentId(paymentId) {
    const normalizedPaymentId = normalizeRecordId(paymentId);
    return cloneValue(Object.values(this.state.payments).find((record) => record.razorpayPaymentId === normalizedPaymentId) ?? null);
  }

  async saveEntitlement(record) {
    if (!this.enabled) {
      throw new Error('Local entitlement storage is disabled in production.');
    }

    const userId = normalizeUserId(record.userId);

    if (!userId) {
      throw new Error('Cannot save entitlement without userId.');
    }

    const previous = this.state.entitlements[userId] ?? {};
    const next = {
      ...previous,
      ...cloneValue(record),
      userId,
      updatedAt: nowIso()
    };
    this.state.entitlements[userId] = next;
    await this.flush();
    return cloneValue(next);
  }

  async getEntitlement(userId) {
    return cloneValue(this.state.entitlements[normalizeUserId(userId)] ?? null);
  }
}

class FirestorePaymentEntitlementStore {
  constructor({ firestore }) {
    this.db = firestore;
    this.mode = 'firestore';
    this.enabled = true;
  }

  paymentsCollection() {
    return this.db.collection(PAYMENT_COLLECTION);
  }

  entitlementsCollection() {
    return this.db.collection(ENTITLEMENT_COLLECTION);
  }

  async savePaymentRecord(record) {
    const recordId = normalizeRecordId(record.id || record.razorpayOrderId || record.razorpayPaymentId);
    const ref = this.paymentsCollection().doc(recordId);
    const snapshot = await ref.get();
    const previous = snapshot.exists ? snapshot.data() : {};
    const next = {
      ...cloneValue(previous),
      ...cloneValue(record),
      id: recordId,
      updatedAt: nowIso()
    };
    await ref.set(next, { merge: true });
    return next;
  }

  async getPaymentRecord(recordId) {
    const snapshot = await this.paymentsCollection().doc(normalizeRecordId(recordId)).get();
    return snapshot.exists ? { id: snapshot.id, ...cloneValue(snapshot.data()) } : null;
  }

  async getPaymentByOrderId(orderId) {
    const snapshot = await this.paymentsCollection()
      .where('razorpayOrderId', '==', normalizeRecordId(orderId))
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...cloneValue(doc.data()) };
  }

  async getPaymentByPaymentId(paymentId) {
    const snapshot = await this.paymentsCollection()
      .where('razorpayPaymentId', '==', normalizeRecordId(paymentId))
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...cloneValue(doc.data()) };
  }

  async saveEntitlement(record) {
    const userId = normalizeUserId(record.userId);

    if (!userId) {
      throw new Error('Cannot save entitlement without userId.');
    }

    const ref = this.entitlementsCollection().doc(userId);
    const snapshot = await ref.get();
    const previous = snapshot.exists ? snapshot.data() : {};
    const next = {
      ...cloneValue(previous),
      ...cloneValue(record),
      userId,
      updatedAt: nowIso()
    };
    await ref.set(next, { merge: true });
    return next;
  }

  async getEntitlement(userId) {
    const snapshot = await this.entitlementsCollection().doc(normalizeUserId(userId)).get();
    return snapshot.exists ? { userId: snapshot.id, ...cloneValue(snapshot.data()) } : null;
  }
}

export function createPaymentEntitlementStore({ stateFile, production = false }) {
  const firestore = getAdminFirestore();

  if (firestore) {
    return new FirestorePaymentEntitlementStore({ firestore });
  }

  return new LocalPaymentEntitlementStore({ stateFile, production });
}
