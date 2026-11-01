/**
 * AquaConnect Firestore Data Engine & Realtime Sync Service
 * Manages full CRUD operations, live snapshot subscriptions, local persistence,
 * direct payment processing, audit trails, and supplier subscription lifecycles.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc as fbSetDoc, 
  updateDoc as fbUpdateDoc, 
  deleteDoc as fbDeleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, isLiveFirebaseConfigured } from './firebase.js';

export const isEmailAccountOrder = (order) => {
  if (!order) return true;
  const cName = (order.customerName || '').toLowerCase();
  const pName = (order.plantName || order.supplierName || '').toLowerCase();
  const cId = (order.customerId || '').toLowerCase();
  const sId = (order.supplierId || '').toLowerCase();
  const phone = (order.customerPhone || '').toLowerCase();

  if (cName.includes('@') || pName.includes('@') || cId.includes('@') || phone.includes('@')) return true;
  if (cName.includes('paddu') || cName.includes('jaya') || pName.includes('paddu') || pName.includes('jaya') || cId.includes('paddu') || cId.includes('jaya')) return true;
  return false;
};

export const sanitizeDisplayName = (name, fallback = 'Customer') => {
  if (!name || !name.trim()) return fallback;
  const clean = name.trim();
  if (clean.toLowerCase().includes('paddu') || clean.toLowerCase().includes('jaya')) return fallback;
  if (clean.includes('@')) {
    const prefix = clean.split('@')[0].replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    if (!prefix || prefix.toLowerCase() === 'paddu' || prefix.toLowerCase() === 'jaya') return fallback;
    return prefix.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ').trim();
  }
  return clean;
};

export const sanitizePlantName = (name) => {
  if (!name || !name.trim()) return 'AquaConnect Certified Water Plant';
  const clean = name.trim();
  if (clean.toLowerCase().includes('paddu') || clean.toLowerCase().includes('jaya') || clean.includes('@')) {
    return 'AquaConnect Certified Water Plant';
  }
  return clean;
};

export const ID_FIELD_MAP = {
  users: 'uid',
  suppliers: 'supplierId',
  products: 'productId',
  customers: 'customerId',
  orders: 'orderId',
  deliveries: 'deliveryId',
  inventory: 'inventoryId',
  notifications: 'notificationId',
  payments: 'paymentId',
  audit_logs: 'logId',
  supplier_subscriptions: 'subscriptionId',
  customer_subscriptions: 'subscriptionId',
  subscription_plans: 'planId',
  order_status_history: 'historyId',
  payment_verification_history: 'verificationId'
};

// Initial Seed Data with PRD-compliant schemas
export const SEED_DATA = {
  users: [
    {
      uid: 'admin_001',
      name: 'Aqua Admin',
      email: 'admin@aquaconnect.com',
      password: 'admin123',
      role: 'admin',
      platformRole: 'admin',
      phone: '+91 85228 28688',
      accountStatus: 'Active',
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      uid: 'superadmin_001',
      name: 'Chief Super Admin',
      email: 'superadmin@aquaconnect.com',
      password: 'super123',
      role: 'super_admin',
      phone: '+91 85228 28688',
      accountStatus: 'Active',
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    }
  ],

  suppliers: [],

  products: [
    {
      productId: 'prod_001',
      supplierId: null,
      name: '20L Normal RO Water Can',
      description: 'Standard 20 Litre purified RO+UV mineral water in returnable crystal blue can.',
      price: 50,
      image: '/images/bubble_top_can.jpg',
      stock: 100,
      unit: '20L',
      containerType: 'Returnable Jar',
      isActive: true,
      createdAt: '2026-01-11T10:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      productId: 'prod_002',
      supplierId: null,
      name: '20L Cool / Chilled Water Can',
      description: 'Chilled 20 Litre purified mineral water insulated camper can with fresh dispensing tap.',
      price: 65,
      image: '/images/cool_water_can.jpg',
      stock: 80,
      unit: '20L Chilled',
      containerType: 'Returnable Jar',
      isActive: true,
      createdAt: '2026-01-11T10:30:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      productId: 'prod_003',
      supplierId: null,
      name: 'Drinking Water Packets (50 Pouches)',
      description: 'Bundle of 50 hygienic 250ml sealed food-grade drinking water pouches.',
      price: 75,
      image: '/images/water_pouches_pack.jpg',
      stock: 100,
      unit: '250ml x 50',
      containerType: 'Water Packet',
      isActive: true,
      createdAt: '2026-01-12T11:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      productId: 'prod_004',
      supplierId: null,
      name: '1L Water Bottles (Box of 12)',
      description: 'Carton of twelve 1 Litre packaged natural mineral water bottles.',
      price: 180,
      image: '/images/bottled_water_pack.jpg',
      stock: 50,
      unit: '1L x 12',
      containerType: 'Packaged Box',
      isActive: true,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      productId: 'prod_005',
      supplierId: null,
      name: '500ml Water Bottles (Box of 24)',
      description: 'Carton of 24 packaged 500ml pure mineral water bottles for events and travel.',
      price: 220,
      image: '/images/bottled_water_pack.jpg',
      stock: 50,
      unit: '500ml x 24',
      containerType: 'Packaged Box',
      isActive: true,
      createdAt: '2026-01-16T09:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    }
  ],

  customers: [],

  subscription_plans: [
    // -------------------------------------------------------------------------
    // SUPPLIER SUBSCRIPTION PLANS (B2B SaaS)
    // -------------------------------------------------------------------------
    {
      planId: 'plan_starter',
      targetRole: 'supplier',
      name: 'Free Trial (1 Day)',
      monthlyPrice: 0,
      yearlyPrice: 0,
      price: 0,
      billingCycle: '1-Day Free Trial',
      trialDays: 1,
      status: 'published', // 'draft' | 'published'
      orderLimit: 25,
      features: [
        '1-Day Full Platform Trial Access',
        'Direct Cash & UPI Order Logging',
        'Live Delivery Dispatch & Tracking',
        'Automatic credential lock after 1 day'
      ],
      featureFlags: {
        onlineOrdering: true,
        routeOptimization: false,
        prioritySupport: false,
        analyticsExport: false
      },
      limits: {
        maxOrdersPerMonth: 25,
        maxDeliveryStaff: 2
      },
      isActive: true
    },
    {
      planId: 'plan_pro',
      targetRole: 'supplier',
      name: 'Pro Flow Plan',
      monthlyPrice: 999,
      yearlyPrice: 9999, // 2 months free
      price: 999,
      billingCycle: 'Monthly or Yearly',
      trialDays: 14,
      status: 'published',
      orderLimit: null, // unlimited
      features: [
        'Unlimited Customer Orders',
        'Live Real-time Order & Payment Alerts',
        'Custom Supplier UPI & QR Code Payments',
        'Empty can return tracking',
        'Priority Phone & WhatsApp Support'
      ],
      featureFlags: {
        onlineOrdering: true,
        routeOptimization: true,
        prioritySupport: true,
        analyticsExport: true
      },
      limits: {
        maxOrdersPerMonth: 10000,
        maxDeliveryStaff: 10
      },
      isPopular: true,
      isActive: true
    },
    {
      planId: 'plan_enterprise',
      targetRole: 'supplier',
      name: 'Enterprise Aqua',
      monthlyPrice: 2999,
      yearlyPrice: 29999, // 2 months free
      price: 2999,
      billingCycle: 'Monthly or Yearly',
      trialDays: 30,
      status: 'published',
      orderLimit: null, // unlimited
      features: [
        'Multi-plant dispatch & routes',
        'Custom delivery vans fleet manager',
        'Advanced GST & Financial CSV exports',
        'Custom QR Scanner & Dedicated Merchant Routing',
        'Dedicated 24/7 Account Manager'
      ],
      featureFlags: {
        onlineOrdering: true,
        routeOptimization: true,
        prioritySupport: true,
        analyticsExport: true,
        customQrBranding: true
      },
      limits: {
        maxOrdersPerMonth: 100000,
        maxDeliveryStaff: 50
      },
      isActive: true
    },

    // -------------------------------------------------------------------------
    // CUSTOMER SUBSCRIPTION (B2C — always free, no paid tiers)
    // -------------------------------------------------------------------------
    {
      planId: 'plan_cust_free',
      targetRole: 'customer',
      name: 'Basic Consumer (Free)',
      monthlyPrice: 0,
      yearlyPrice: 0,
      price: 0,
      billingCycle: 'Free Forever',
      trialDays: 0,
      status: 'published',
      orderLimit: null,
      features: [
        'Standard water jar ordering',
        'Cash on Delivery & UPI payments',
        'Real-time order delivery tracking',
        'Unlimited orders — completely free'
      ],
      featureFlags: {
        freeDelivery: false,
        prioritySlot: false,
        cashback: false,
        dispenserCleaning: false
      },
      limits: {
        maxActiveOrders: 999
      },
      isActive: true
    }
  ],

  supplier_subscriptions: [],
  customer_subscriptions: [],
  orders: [],
  payments: [],
  deliveries: [],
  inventory: [],
  audit_logs: [],
  order_status_history: [],
  payment_verification_history: [],
  deleted_accounts: [],

  platform_settings: {
    id: 'platform_settings',
    adminUpiId: 'aquaconnect.admin@upi',
    adminPhone: '8522828688',
    adminQrCodeUrl: '',
    customerCarePhone: '+91 85228 28688',
    customerCareEmail: 'support@aquaconnect.com',
    customerCareWhatsapp: '+91 85228 28688',
    customerCareHours: '9:00 AM - 8:00 PM (Mon-Sat)',
    updatedAt: '2026-03-20T10:00:00Z'
  },

  notifications: []
};

const STORAGE_KEY = 'aquaconnect_firestore_db_v3';

// Event listeners for reactive cross-component communication
const listeners = new Set();
let isNotifying = false;

const notifyListeners = (collection) => {
  if (isNotifying) return; // Prevent re-entrant infinite loops
  isNotifying = true;
  try {
    listeners.forEach(callback => {
      try {
        callback(collection);
      } catch (e) {
        console.error("Listener callback error:", e);
      }
    });
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('aquaconnect_data_synced', { detail: { collection } }));
      } catch (e) {
        // ignore
      }
    }
  } finally {
    isNotifying = false;
  }
};

export const subscribeToData = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const DUMMY_IDS = new Set([
  'sup_001', 'sup_002', 'owner_001', 'cust_001', 'usr_del_001', 'usr_del_002',
  'AC2001', 'AC2002', 'ord_101', 'ord_102', 'ord_103', 'ord_104', 'ord_105', 'ord_106',
  'pay_001', 'pay_002', 'pay_003', 'pay_004', 'pay_005',
  'del_001', 'del_002',
  'inv_001', 'inv_002', 'inv_003', 'inv_004', 'inv_005',
  'sub_001', 'csub_001',
  'log_001', 'log_002', 'log_003', 'log_004',
  'osh_001', 'pvh_001',
  'del_seed_001', 'del_seed_002'
]);

export const DUMMY_EMAILS = new Set([
  'owner@aquaconnect.com',
  'supplier@aquaconnect.com',
  'aquapure@water.com',
  'aquapure@aquaconnect.com',
  'ramesh@customer.com',
  'customer@aquaconnect.com',
  'balaji.waters@oldmail.com',
  'ananya.old@gmail.com'
]);

export const isDummyRecord = (item) => {
  if (!item) return false;
  const id = item.orderId || item.paymentId || item.deliveryId || item.inventoryId || 
             item.subscriptionId || item.logId || item.historyId || item.verificationId || 
             item.deletedId || item.supplierId || item.customerId || item.uid || item.id || '';
  if (DUMMY_IDS.has(id)) return true;
  
  const email = (item.email || '').toLowerCase();
  if (DUMMY_EMAILS.has(email)) return true;

  if (item.customerId && DUMMY_IDS.has(item.customerId)) return true;
  if (item.supplierId && (item.supplierId === 'sup_001' || item.supplierId === 'sup_002')) return true;
  if (item.orderId && (item.orderId === 'AC2001' || item.orderId === 'AC2002')) return true;

  return false;
};

// Load or initialize state with graceful schema migration
const loadStore = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      // Check if previous v2 store exists to carry forward user's live custom items
      let existingV2 = null;
      try {
        const v2Raw = localStorage.getItem('aquaconnect_firestore_db_v2');
        if (v2Raw) existingV2 = JSON.parse(v2Raw);
      } catch (e) {
        // ignore
      }

      const initial = JSON.parse(JSON.stringify(SEED_DATA));
      if (existingV2 && typeof existingV2 === 'object') {
        // Merge existing products, orders, and custom users
        if (Array.isArray(existingV2.products) && existingV2.products.length > 0) {
          initial.products = existingV2.products;
        }
        if (Array.isArray(existingV2.orders) && existingV2.orders.length > 0) {
          initial.orders = [...existingV2.orders, ...initial.orders.filter(io => !existingV2.orders.some(eo => eo.orderId === io.orderId))];
        }
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
      return initial;
    }

    const parsed = JSON.parse(raw);

    // Ensure all critical collections exist
    Object.keys(SEED_DATA).forEach(key => {
      if (!parsed[key]) {
        parsed[key] = JSON.parse(JSON.stringify(SEED_DATA[key]));
      }
    });

    // Ensure default admin users always exist and have updated phone 8522828688 (do not resurrect deleted customers/suppliers)
    SEED_DATA.users.filter(u => u.role === 'admin' || u.role === 'super_admin').forEach(seedUser => {
      const existing = parsed.users.find(u => u.email === seedUser.email);
      if (!existing) {
        parsed.users.push(seedUser);
      } else {
        existing.phone = '+91 85228 28688';
      }
    });

    // Also sanitize cached user session in localStorage if it has the stale phone or dummy phone
    try {
      if (typeof localStorage !== 'undefined') {
        const cachedUserRaw = localStorage.getItem('aquaconnect_auth_user');
        if (cachedUserRaw) {
          const cu = JSON.parse(cachedUserRaw);
          if (cu && (cu.role === 'admin' || cu.role === 'super_admin' || cu.email?.endsWith('@aquaconnect.com') || (cu.phone && (cu.phone.includes('98765') || cu.phone.includes('00001'))))) {
            cu.phone = '+91 85228 28688';
            localStorage.setItem('aquaconnect_auth_user', JSON.stringify(cu));
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // Ensure subscription plans exist and have both supplier and customer plans
    if (!parsed.subscription_plans || parsed.subscription_plans.length === 0) {
      parsed.subscription_plans = JSON.parse(JSON.stringify(SEED_DATA.subscription_plans));
    } else {
      SEED_DATA.subscription_plans.forEach(sp => {
        const existingIdx = parsed.subscription_plans.findIndex(p => p.planId === sp.planId);
        if (existingIdx === -1) {
          parsed.subscription_plans.push(JSON.parse(JSON.stringify(sp)));
        } else if (sp.planId === 'plan_starter') {
          parsed.subscription_plans[existingIdx].name = 'Free Trial (1 Day)';
          parsed.subscription_plans[existingIdx].trialDays = 1;
          parsed.subscription_plans[existingIdx].billingCycle = '1-Day Free Trial';
        }
      });
    }

    if (!parsed.trial_registry) {
      parsed.trial_registry = [];
    }

    if (parsed.supplier_subscriptions) {
      parsed.supplier_subscriptions.forEach(s => {
        if (s.isTrial || s.planId === 'plan_starter' || (s.planName || '').toLowerCase().includes('trial')) {
          s.amount = 0;
          s.billingCycle = '1-Day Free Trial';
          if (Array.isArray(s.paymentHistory)) {
            s.paymentHistory.forEach(ph => { ph.amount = 0; });
          }
        }
      });
    }

    if (!parsed.customer_subscriptions) {
      parsed.customer_subscriptions = JSON.parse(JSON.stringify(SEED_DATA.customer_subscriptions || []));
    }

    // Ensure product images use fallback only if completely missing
    if (parsed.products) {
      parsed.products.forEach(p => {
        if (!p.image || p.image.includes('imimg.com')) {
          if (p.name?.toLowerCase().includes('cool') || p.name?.toLowerCase().includes('chilled')) {
            p.image = '/images/cool_water_can.jpg';
          } else if (p.name?.toLowerCase().includes('packet') || p.name?.toLowerCase().includes('pouch')) {
            p.image = '/images/water_pouches_pack.jpg';
          } else if (p.name?.toLowerCase().includes('bottle')) {
            p.image = '/images/bottled_water_pack.jpg';
          } else {
            p.image = '/images/bubble_top_can.jpg';
          }
        }
      });
    }

    // Automatically purge all legacy mock / dummy seed data from localStorage store
    let modified = false;
    if (Array.isArray(parsed.users)) {
      const origLen = parsed.users.length;
      parsed.users = parsed.users.filter(u => (u.role === 'admin' || u.role === 'super_admin') || (!DUMMY_IDS.has(u.uid) && !DUMMY_EMAILS.has((u.email || '').toLowerCase())));
      if (parsed.users.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.suppliers)) {
      const origLen = parsed.suppliers.length;
      parsed.suppliers = parsed.suppliers.filter(s => !DUMMY_IDS.has(s.supplierId || s.id) && !DUMMY_EMAILS.has((s.email || '').toLowerCase()));
      if (parsed.suppliers.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.customers)) {
      const origLen = parsed.customers.length;
      parsed.customers = parsed.customers.filter(c => !DUMMY_IDS.has(c.customerId || c.id) && !DUMMY_EMAILS.has((c.email || '').toLowerCase()));
      if (parsed.customers.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.orders)) {
      const origLen = parsed.orders.length;
      parsed.orders = parsed.orders.filter(o => !DUMMY_IDS.has(o.orderId) && !DUMMY_IDS.has(o.customerId) && o.supplierId !== 'sup_001' && o.supplierId !== 'sup_002');
      if (parsed.orders.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.payments)) {
      const origLen = parsed.payments.length;
      parsed.payments = parsed.payments.filter(p => !DUMMY_IDS.has(p.paymentId) && !DUMMY_IDS.has(p.orderId) && p.supplierId !== 'sup_001' && p.supplierId !== 'sup_002');
      if (parsed.payments.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.deliveries)) {
      const origLen = parsed.deliveries.length;
      parsed.deliveries = parsed.deliveries.filter(d => !DUMMY_IDS.has(d.deliveryId) && !DUMMY_IDS.has(d.orderId) && d.supplierId !== 'sup_001');
      if (parsed.deliveries.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.inventory)) {
      const origLen = parsed.inventory.length;
      parsed.inventory = parsed.inventory.filter(i => !DUMMY_IDS.has(i.inventoryId) && i.supplierId !== 'sup_001');
      if (parsed.inventory.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.supplier_subscriptions)) {
      const origLen = parsed.supplier_subscriptions.length;
      parsed.supplier_subscriptions = parsed.supplier_subscriptions.filter(s => !DUMMY_IDS.has(s.subscriptionId) && s.supplierId !== 'sup_001' && s.supplierId !== 'sup_002');
      if (parsed.supplier_subscriptions.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.customer_subscriptions)) {
      const origLen = parsed.customer_subscriptions.length;
      parsed.customer_subscriptions = parsed.customer_subscriptions.filter(s => !DUMMY_IDS.has(s.subscriptionId) && s.customerId !== 'cust_001');
      if (parsed.customer_subscriptions.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.audit_logs)) {
      const origLen = parsed.audit_logs.length;
      parsed.audit_logs = parsed.audit_logs.filter(l => !DUMMY_IDS.has(l.logId) && !DUMMY_IDS.has(l.actor?.uid));
      if (parsed.audit_logs.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.deleted_accounts)) {
      const origLen = parsed.deleted_accounts.length;
      parsed.deleted_accounts = parsed.deleted_accounts.filter(a => !DUMMY_IDS.has(a.deletedId) && !DUMMY_IDS.has(a.userId) && !DUMMY_EMAILS.has((a.email || '').toLowerCase()));
      if (parsed.deleted_accounts.length !== origLen) modified = true;
    }
    if (Array.isArray(parsed.order_status_history)) {
      parsed.order_status_history = parsed.order_status_history.filter(h => !DUMMY_IDS.has(h.historyId) && !DUMMY_IDS.has(h.orderId));
    }
    if (Array.isArray(parsed.payment_verification_history)) {
      parsed.payment_verification_history = parsed.payment_verification_history.filter(h => !DUMMY_IDS.has(h.verificationId) && !DUMMY_IDS.has(h.paymentId));
    }

    if (modified && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch (e) {
        // ignore
      }
    }

    return parsed;
  } catch (e) {
    console.warn("Could not load from localStorage, using memory seed:", e);
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
};

const saveStore = (data) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.warn("Could not write to localStorage:", e);
  }
};

let store = loadStore();

// Reset data helper
export const resetToDemoSeed = () => {
  store = JSON.parse(JSON.stringify(SEED_DATA));
  saveStore(store);
  notifyListeners('all');
  return store;
};

// Purge all mock/dummy seed data permanently, keeping only authentic user accounts & orders
export const purgeAllDummyData = (adminActor = null) => {
  store = loadStore();

  store.users = (store.users || []).filter(u => 
    (u.role === 'admin' || u.role === 'super_admin') || 
    (!DUMMY_IDS.has(u.uid) && !DUMMY_EMAILS.has((u.email || '').toLowerCase()))
  );

  store.suppliers = (store.suppliers || []).filter(s => 
    !DUMMY_IDS.has(s.supplierId || s.id) && 
    !DUMMY_EMAILS.has((s.email || '').toLowerCase())
  );

  store.customers = (store.customers || []).filter(c => 
    !DUMMY_IDS.has(c.customerId || c.id) && 
    !DUMMY_EMAILS.has((c.email || '').toLowerCase())
  );

  store.orders = (store.orders || []).filter(o => 
    !DUMMY_IDS.has(o.orderId) && 
    !DUMMY_IDS.has(o.customerId) && 
    o.supplierId !== 'sup_001' && 
    o.supplierId !== 'sup_002'
  );

  store.payments = (store.payments || []).filter(p => 
    !DUMMY_IDS.has(p.paymentId) && 
    !DUMMY_IDS.has(p.orderId) && 
    p.supplierId !== 'sup_001' && 
    p.supplierId !== 'sup_002'
  );

  store.deliveries = (store.deliveries || []).filter(d => 
    !DUMMY_IDS.has(d.deliveryId) && 
    !DUMMY_IDS.has(d.orderId) && 
    d.supplierId !== 'sup_001'
  );

  store.inventory = (store.inventory || []).filter(i => 
    !DUMMY_IDS.has(i.inventoryId) && 
    i.supplierId !== 'sup_001'
  );

  store.supplier_subscriptions = (store.supplier_subscriptions || []).filter(s => 
    !DUMMY_IDS.has(s.subscriptionId) && 
    s.supplierId !== 'sup_001' && 
    s.supplierId !== 'sup_002'
  );

  store.customer_subscriptions = (store.customer_subscriptions || []).filter(s => 
    !DUMMY_IDS.has(s.subscriptionId) && 
    s.customerId !== 'cust_001'
  );

  store.audit_logs = (store.audit_logs || []).filter(l => 
    !DUMMY_IDS.has(l.logId) && 
    !DUMMY_IDS.has(l.actor?.uid)
  );

  store.deleted_accounts = (store.deleted_accounts || []).filter(a => 
    !DUMMY_IDS.has(a.deletedId) && 
    !DUMMY_IDS.has(a.userId) && 
    !DUMMY_EMAILS.has((a.email || '').toLowerCase())
  );

  store.order_status_history = (store.order_status_history || []).filter(h => 
    !DUMMY_IDS.has(h.historyId) && 
    !DUMMY_IDS.has(h.orderId)
  );

  store.payment_verification_history = (store.payment_verification_history || []).filter(h => 
    !DUMMY_IDS.has(h.verificationId) && 
    !DUMMY_IDS.has(h.paymentId)
  );

  if (Array.isArray(store.audit_logs)) {
    store.audit_logs.push({
      logId: `log_purge_${Date.now()}`,
      actor: {
        uid: adminActor?.uid || 'admin_001',
        name: adminActor?.name || 'Administrator',
        role: adminActor?.role || 'admin'
      },
      action: 'PLATFORM_DUMMY_DATA_PURGED',
      entityType: 'system',
      entityId: 'global',
      metadata: {
        message: 'All dummy mock seed records have been purged. Platform operating with 100% genuine user data.',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  saveStore(store);
  notifyListeners('all');
  return { success: true, message: 'All dummy seed data wiped clean.' };
};

// Force reload store directly from localStorage to ensure latest multi-tab/client updates
export const reloadStore = (notify = false) => {
  store = loadStore();
  if (notify) {
    notifyListeners('all');
  }
  return store;
};

// Firestore Collection Live Sync Listeners
const activeUnsubscribes = [];

export const initFirestoreLiveSync = () => {
  if (!isLiveFirebaseConfigured() || !db) {
    return;
  }

  // Clear existing listeners
  activeUnsubscribes.forEach(unsub => unsub && unsub());
  activeUnsubscribes.length = 0;

  const collections = [
    'users', 
    'suppliers', 
    'products', 
    'customers', 
    'orders', 
    'deliveries', 
    'inventory', 
    'notifications',
    'payments',
    'audit_logs',
    'supplier_subscriptions',
    'customer_subscriptions',
    'subscription_plans'
  ];

  collections.forEach(colName => {
    try {
      const colRef = collection(db, colName);
      const unsub = onSnapshot(colRef, (snapshot) => {
        const idField = ID_FIELD_MAP[colName] || 'id';
        const remoteItems = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          if (!data[idField]) {
            data[idField] = docSnap.id;
          }
          return data;
        });

        // Safely update store with remoteItems while preserving newly created local records
        const currentLocal = store[colName] || [];
        if (remoteItems.length > 0) {
          const remoteIdSet = new Set(remoteItems.map(item => String(item[idField])));
          const pendingLocal = currentLocal.filter(localItem => !remoteIdSet.has(String(localItem[idField])));
          store[colName] = [...remoteItems, ...pendingLocal];
          saveStore(store);
          notifyListeners(colName);
        } else if (currentLocal.length > 0) {
          // If remote is empty, retain local data and initialize cloud subscription plans
          console.debug(`[AquaConnect Storage] Remote collection ${colName} is empty; retaining local items.`);
          if (colName === 'subscription_plans') {
            currentLocal.forEach(plan => {
              if (plan && plan.planId) {
                const docRef = doc(db, colName, plan.planId);
                fbSetDoc(docRef, sanitizeForFirestore(plan), { merge: true }).catch(() => {});
              }
            });
          }
        }
      }, (error) => {
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permissions'))) {
          console.debug(`[AquaConnect Storage] Remote onSnapshot for ${colName} deferred to local state (cloud permissions pending).`);
        } else {
          console.warn(`Firestore onSnapshot warning for ${colName}:`, error.message);
        }
      });
      activeUnsubscribes.push(unsub);
    } catch (e) {
      console.warn(`Could not attach listener for ${colName}:`, e);
    }
  });

  // Real-time synchronization for platform subscription plans and payment config
  try {
    const configDocRef = doc(db, 'users', 'platform_config');
    const unsubConfig = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let changed = false;
        if (Array.isArray(data.subscription_plans) && data.subscription_plans.length > 0) {
          store.subscription_plans = data.subscription_plans;
          changed = true;
        }
        if (data.platform_settings) {
          store.platform_settings = data.platform_settings;
          changed = true;
        }
        if (changed) {
          saveStore(store);
          notifyListeners('subscription_plans');
          notifyListeners('platform_settings');
        }
      }
    }, (err) => {
      console.warn("Live platform config sync warning:", err.message);
    });
    activeUnsubscribes.push(unsubConfig);
  } catch (e) {
    console.warn("Could not attach platform_config listener:", e);
  }
};

// Cross-tab real-time sync across multiple tabs/windows (Supplier <-> Customer)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        store = JSON.parse(e.newValue);
        notifyListeners('all');
      } catch (err) {
        console.warn('Cross-tab storage sync error:', err);
      }
    }
  });
}

// Auto-initialize real-time sync if live Firebase is active
if (typeof window !== 'undefined' && isLiveFirebaseConfigured()) {
  initFirestoreLiveSync();
}

// Seed Live Firestore Database with Initial Data
export const seedLiveFirestore = async () => {
  if (!isLiveFirebaseConfigured() || !db) {
    throw new Error("Live Firebase is not configured. Please fill in your .env.local credentials first.");
  }

  const collections = [
    'users', 
    'suppliers', 
    'products', 
    'customers', 
    'orders', 
    'deliveries', 
    'inventory', 
    'notifications',
    'payments',
    'audit_logs',
    'supplier_subscriptions',
    'customer_subscriptions',
    'subscription_plans'
  ];
  const summary = {};

  for (const colName of collections) {
    const items = SEED_DATA[colName] || [];
    const idField = ID_FIELD_MAP[colName] || 'id';
    let count = 0;

    for (const item of items) {
      const docId = String(item[idField] || `doc_${Date.now()}`);
      if (docId) {
        const docRef = doc(db, colName, docId);
        await fbSetDoc(docRef, item, { merge: true });
        count++;
      }
    }
    summary[colName] = count;
  }

  resetToDemoSeed();
  return summary;
};

// Generic Collection Accessors
export const getCollection = (collectionName) => {
  return [...(store[collectionName] || [])];
};

export const getDoc = (collectionName, idField, idValue) => {
  const list = store[collectionName] || [];
  return list.find(item => String(item[idField]) === String(idValue)) || null;
};

// Helper to strip undefined values so Firestore never rejects payloads
export const sanitizeForFirestore = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
};

export const setDoc = (collectionName, idField, docData) => {
  if (!store[collectionName]) store[collectionName] = [];
  const index = store[collectionName].findIndex(item => String(item[idField]) === String(docData[idField]));
  if (index >= 0) {
    store[collectionName][index] = { 
      ...store[collectionName][index], 
      ...docData, 
      updatedAt: new Date().toISOString() 
    };
  } else {
    store[collectionName].unshift({
      ...docData,
      createdAt: docData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  saveStore(store);
  notifyListeners(collectionName);

  // Asynchronous sync to live Firestore backend
  if (isLiveFirebaseConfigured() && db && docData[idField]) {
    try {
      const docRef = doc(db, collectionName, String(docData[idField]));
      const sanitized = sanitizeForFirestore(docData);
      fbSetDoc(docRef, sanitized, { merge: true }).catch(err => {
        if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permissions'))) {
          console.debug(`[AquaConnect Storage] Remote Firestore setDoc for ${collectionName} handled in local database (cloud permissions pending).`);
        } else {
          console.warn(`Firestore setDoc sync warning (${collectionName}):`, err.message);
        }
      });
    } catch (err) {
      console.warn(`Firestore setDoc sync error (${collectionName}):`, err);
    }
  }

  return docData;
};

export const updateDoc = (collectionName, idField, idValue, updates) => {
  if (!store[collectionName]) return null;
  const index = store[collectionName].findIndex(item => String(item[idField]) === String(idValue));
  if (index >= 0) {
    store[collectionName][index] = {
      ...store[collectionName][index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveStore(store);
    notifyListeners(collectionName);

    // Asynchronous sync to live Firestore backend
    if (isLiveFirebaseConfigured() && db && idValue) {
      try {
        const docRef = doc(db, collectionName, String(idValue));
        const sanitized = sanitizeForFirestore(updates);
        fbUpdateDoc(docRef, sanitized).catch(err => {
          if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permissions'))) {
            console.debug(`[AquaConnect Storage] Remote Firestore updateDoc for ${collectionName} handled in local database (cloud permissions pending).`);
          } else {
            console.warn(`Firestore updateDoc sync warning (${collectionName}):`, err.message);
          }
        });
      } catch (err) {
        console.warn(`Firestore updateDoc sync error (${collectionName}):`, err);
      }
    }

    return store[collectionName][index];
  }
  return null;
};

export const deleteDoc = (collectionName, idField, idValue) => {
  if (!store[collectionName]) return false;
  const initialLen = store[collectionName].length;
  store[collectionName] = store[collectionName].filter(item => String(item[idField]) !== String(idValue));
  if (store[collectionName].length !== initialLen) {
    saveStore(store);
    notifyListeners(collectionName);

    // Asynchronous sync to live Firestore backend
    if (isLiveFirebaseConfigured() && db && idValue) {
      try {
        const docRef = doc(db, collectionName, String(idValue));
        fbDeleteDoc(docRef).catch(err => {
          if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permissions'))) {
            console.debug(`[AquaConnect Storage] Remote Firestore deleteDoc for ${collectionName} handled in local database (cloud permissions pending).`);
          } else {
            console.warn(`Firestore deleteDoc sync warning (${collectionName}):`, err.message);
          }
        });
      } catch (err) {
        console.warn(`Firestore deleteDoc sync error (${collectionName}):`, err);
      }
    }

    return true;
  }
  return false;
};

// Check if an account has been permanently deleted
export const isAccountDeleted = (email, uid) => {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanUid = String(uid || '').trim();
  const deleted = getCollection('deleted_accounts') || [];
  return deleted.some(d => {
    const dEmail = (d.email || '').toLowerCase().trim();
    const dUid = String(d.userId || d.uid || '').trim();
    return (cleanEmail && dEmail && dEmail === cleanEmail) || (cleanUid && dUid && dUid === cleanUid);
  });
};

export const removeAccountFromDeleted = (email, uid) => {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanUid = String(uid || '').trim();
  if (store.deleted_accounts) {
    store.deleted_accounts = store.deleted_accounts.filter(d => {
      const dEmail = (d.email || '').toLowerCase().trim();
      const dUid = String(d.userId || d.uid || '').trim();
      const match = (cleanEmail && dEmail && dEmail === cleanEmail) || (cleanUid && dUid && dUid === cleanUid);
      return !match;
    });
    saveStore(store);
    notifyListeners('deleted_accounts');
  }
};

// Permanent account and associated record deletion across local and live Firestore
export const deleteAccountPermanently = async (userId, userRole, reason = 'User requested permanent account closure') => {
  if (!userId) return false;

  // 1. Snapshot user profile before deletion for backend audit & archive
  const targetIdStr = String(userId).trim();
  const userSnapshot = (store.users || []).find(u => String(u.uid) === targetIdStr || String(u.id) === targetIdStr);
  const custSnapshot = (store.customers || []).find(c => String(c.customerId) === targetIdStr || String(c.userId) === targetIdStr || String(c.id) === targetIdStr);
  const supSnapshot = (store.suppliers || []).find(s => String(s.supplierId) === targetIdStr || String(s.userId) === targetIdStr || String(s.id) === targetIdStr);

  const targetEmail = (userSnapshot?.email || custSnapshot?.email || supSnapshot?.email || '').toLowerCase().trim();

  // Gather all associated identifier keys for this user across tables
  const allIds = new Set([
    targetIdStr,
    userSnapshot?.uid,
    userSnapshot?.id,
    custSnapshot?.customerId,
    custSnapshot?.userId,
    custSnapshot?.id,
    supSnapshot?.supplierId,
    supSnapshot?.userId,
    supSnapshot?.id
  ].filter(Boolean).map(String));

  if (!store.deleted_accounts) store.deleted_accounts = [];
  const delRecord = {
    deletedId: `del_${targetIdStr}_${Date.now()}`,
    userId: targetIdStr,
    uid: userSnapshot?.uid || targetIdStr,
    name: userSnapshot?.name || custSnapshot?.name || supSnapshot?.businessName || 'User Account',
    email: targetEmail || 'N/A',
    phone: userSnapshot?.phone || custSnapshot?.phone || supSnapshot?.phone || 'N/A',
    role: userRole || userSnapshot?.role || (supSnapshot ? 'supplier' : 'customer'),
    address: userSnapshot?.address || custSnapshot?.address || supSnapshot?.address || '',
    deletedAt: new Date().toISOString(),
    status: 'Deleted from Backend',
    reason: reason,
    previousOrders: custSnapshot?.totalOrders || supSnapshot?.totalOrders || 0,
    planName: supSnapshot?.planName || userSnapshot?.planName || (userRole === 'supplier' ? 'Starter Plan' : 'Retail Customer')
  };
  store.deleted_accounts.unshift(delRecord);

  // 2. Remove from active local store collections thoroughly by all known IDs and email
  if (store.users) {
    store.users = store.users.filter(u => 
      !allIds.has(String(u.uid)) && 
      !allIds.has(String(u.id)) &&
      (!targetEmail || (u.email || '').toLowerCase().trim() !== targetEmail)
    );
  }
  if (store.customers) {
    store.customers = store.customers.filter(c => 
      !allIds.has(String(c.customerId)) && 
      !allIds.has(String(c.userId)) && 
      !allIds.has(String(c.id)) &&
      (!targetEmail || (c.email || '').toLowerCase().trim() !== targetEmail)
    );
  }
  if (store.suppliers) {
    store.suppliers = store.suppliers.filter(s => 
      !allIds.has(String(s.supplierId)) && 
      !allIds.has(String(s.userId)) && 
      !allIds.has(String(s.id)) &&
      (!targetEmail || (s.email || '').toLowerCase().trim() !== targetEmail)
    );
  }

  // 3. Purge cached session in localStorage if active
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('aquaconnect_auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (allIds.has(String(u.uid)) || (targetEmail && (u.email || '').toLowerCase().trim() === targetEmail)) {
          localStorage.removeItem('aquaconnect_auth_user');
          localStorage.removeItem('aquaconnect_auth_role');
        }
      }
    }
  } catch (e) {}

  saveStore(store);
  notifyListeners('users');
  notifyListeners('deleted_accounts');
  notifyListeners('customers');
  notifyListeners('suppliers');
  notifyListeners('all');

  // 4. Remove from remote Firestore and sync to deleted_accounts collection
  if (isLiveFirebaseConfigured() && db) {
    try {
      const delDocId = `del_${targetIdStr}_${Date.now()}`;
      await fbSetDoc(doc(db, 'deleted_accounts', delDocId), delRecord).catch(() => {});

      for (const id of allIds) {
        await fbDeleteDoc(doc(db, 'users', id)).catch(() => {});
        await fbDeleteDoc(doc(db, 'customers', id)).catch(() => {});
        await fbDeleteDoc(doc(db, 'suppliers', id)).catch(() => {});
      }
    } catch (err) {
      console.warn("Could not delete document from remote Firestore:", err);
    }
  }

  return true;
};

/**
 * Wipe all residual / test accounts from local and live Firestore backend,
 * ensuring zero mismatch between backend and frontend.
 */
export const purgeResidualAccounts = async () => {
  const adminUsers = (store.users || []).filter(u => u.role === 'admin' || u.role === 'super_admin');
  store.users = adminUsers.length > 0 ? adminUsers : JSON.parse(JSON.stringify(SEED_DATA.users.filter(u => u.role === 'admin' || u.role === 'super_admin')));
  store.suppliers = [];
  store.customers = [];
  saveStore(store);

  if (isLiveFirebaseConfigured() && db) {
    try {
      const sups = await getDocs(collection(db, 'suppliers'));
      for (const d of sups.docs) {
        await fbDeleteDoc(doc(db, 'suppliers', d.id));
      }
      const custs = await getDocs(collection(db, 'customers'));
      for (const d of custs.docs) {
        await fbDeleteDoc(doc(db, 'customers', d.id));
      }
      const usrs = await getDocs(collection(db, 'users'));
      for (const d of usrs.docs) {
        const data = d.data();
        if (data.role !== 'admin' && data.role !== 'super_admin' && d.id !== 'platform_config') {
          await fbDeleteDoc(doc(db, 'users', d.id));
        }
      }
    } catch (err) {
      console.warn("Error purging remote accounts:", err);
    }
  }

  notifyListeners('users');
  notifyListeners('suppliers');
  notifyListeners('customers');
  notifyListeners('all');
  return true;
};

/**
 * Admin action to restore a previously deleted account back to active directory
 */
export const restoreDeletedAccount = (deletedId) => {
  if (!store.deleted_accounts) return false;
  const item = store.deleted_accounts.find(d => d.deletedId === deletedId);
  if (!item) return false;

  // Restore snapshot or construct active user
  if (item.snapshot?.user) {
    if (!store.users) store.users = [];
    store.users.push({ ...item.snapshot.user, accountStatus: 'Active' });
  } else {
    if (!store.users) store.users = [];
    store.users.push({
      uid: item.userId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      role: item.role,
      address: item.address,
      accountStatus: 'Active',
      createdAt: new Date().toISOString()
    });
  }

  if (item.role === 'customer') {
    if (!store.customers) store.customers = [];
    store.customers.push(item.snapshot?.customer || {
      customerId: item.userId,
      userId: item.userId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      status: 'Active',
      totalOrders: item.previousOrders || 0,
      createdAt: new Date().toISOString()
    });
  }

  if (item.role === 'supplier') {
    if (!store.suppliers) store.suppliers = [];
    store.suppliers.push(item.snapshot?.supplier || {
      supplierId: item.userId,
      businessName: item.name,
      ownerName: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      status: 'Active',
      isVerified: true,
      planName: item.planName || 'Pro Flow Plan',
      createdAt: new Date().toISOString()
    });
  }

  // Remove from deleted_accounts archive
  store.deleted_accounts = store.deleted_accounts.filter(d => d.deletedId !== deletedId);
  saveStore(store);
  notifyListeners('users');
  notifyListeners('deleted_accounts');
  notifyListeners('customers');
  notifyListeners('suppliers');
  return true;
};

/**
 * Admin action to permanently purge a deleted account record from the archive
 */
export const purgeDeletedAccountPermanently = (deletedId) => {
  if (!store.deleted_accounts) return false;
  store.deleted_accounts = store.deleted_accounts.filter(d => d.deletedId !== deletedId);
  saveStore(store);
  notifyListeners('deleted_accounts');
  return true;
};

export const deleteOrder = (orderId) => {
  return deleteDoc('orders', 'orderId', orderId);
};

export const deleteCustomer = (customerId) => {
  if (!customerId) return false;
  deleteDoc('customers', 'customerId', customerId);
  deleteDoc('customers', 'userId', customerId);
  deleteDoc('users', 'uid', customerId);
  if (store.customer_subscriptions) {
    store.customer_subscriptions = store.customer_subscriptions.filter(s => s.customerId !== customerId);
  }
  saveStore(store);
  notifyListeners('customers');
  notifyListeners('users');
  return true;
};

export const deleteSupplier = (supplierId) => {
  if (!supplierId) return false;
  deleteDoc('suppliers', 'supplierId', supplierId);
  deleteDoc('users', 'uid', supplierId);
  if (store.supplier_subscriptions) {
    store.supplier_subscriptions = store.supplier_subscriptions.filter(s => s.supplierId !== supplierId);
  }
  saveStore(store);
  notifyListeners('suppliers');
  notifyListeners('users');
  return true;
};

export const purgeAllDeletedAccounts = () => {
  store.deleted_accounts = [];
  saveStore(store);
  notifyListeners('deleted_accounts');
  return true;
};

export const deleteAllCustomers = (customerIds) => {
  if (Array.isArray(customerIds) && customerIds.length > 0) {
    customerIds.forEach(id => deleteCustomer(id));
    return true;
  }
  const currentList = [...(store.customers || [])];
  currentList.forEach(c => {
    const id = c.customerId || c.userId;
    if (id) deleteCustomer(id);
  });
  return true;
};

// ==========================================
// AUDIT LOGGING ENGINE (Section 6 & 12)
// ==========================================

export const logAuditEvent = (actor, action, entityType, entityId, metadata = {}) => {
  const logEntry = {
    logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    actor: {
      uid: actor?.uid || 'system',
      name: actor?.name || actor?.email || 'System User',
      role: actor?.role || 'system',
      email: actor?.email || ''
    },
    action,
    entityType,
    entityId: String(entityId || ''),
    metadata: sanitizeForFirestore(metadata),
    timestamp: new Date().toISOString()
  };

  setDoc('audit_logs', 'logId', logEntry);
  return logEntry;
};

export const getAuditLogs = () => {
  const logs = getCollection('audit_logs');
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// ==========================================
// DIRECT PAYMENT MANAGEMENT (Section 4, 7, 8)
// ==========================================

export const getOrderPayments = (orderId) => {
  const allPayments = getCollection('payments') || [];
  return allPayments.filter(p => String(p.orderId) === String(orderId));
};

export const calculateOutstandingBalance = (orderId) => {
  const order = getDoc('orders', 'orderId', orderId);
  if (!order) {
    return {
      totalAmount: 0,
      verifiedPaid: 0,
      totalVerifiedPaid: 0,
      reportedPaid: 0,
      totalReportedPaid: 0,
      totalPendingVerification: 0,
      totalPaid: 0,
      verifiedBalance: 0,
      outstandingBalance: 0,
      pendingBalance: 0,
      paymentStatus: 'Unpaid'
    };
  }

  const payments = getOrderPayments(orderId);
  // Total payments (treat all received direct payments as verified - remove admin verification bottleneck)
  const totalPaid = payments
    .filter(p => p.status !== 'Disputed' && p.status !== 'Cancelled')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const verifiedPaid = totalPaid;
  const reportedPaid = 0;

  const total = Number(order.totalAmount) || 0;
  const isDirectPaid = order.paymentStatus === 'Paid' || 
                       order.paymentStatus === 'Pending Verification' || 
                       order.paymentMethod === 'UPI' || 
                       order.paymentMethod === 'Online Payment' || 
                       order.paymentMethod === 'UPI Direct';
  const effectiveTotalPaid = isDirectPaid ? Math.max(totalPaid, total) : totalPaid;
  const verifiedBalance = isDirectPaid ? 0 : Math.max(0, total - effectiveTotalPaid);
  const pendingBalance = 0;

  let paymentStatus = 'Unpaid';
  if ((verifiedBalance === 0 && total > 0) || isDirectPaid) {
    paymentStatus = 'Paid';
  } else if (effectiveTotalPaid > 0) {
    paymentStatus = 'Partially Paid';
  }

  return {
    totalAmount: total,
    verifiedPaid: effectiveTotalPaid,
    totalVerifiedPaid: effectiveTotalPaid,
    reportedPaid: 0,
    totalReportedPaid: 0,
    totalPendingVerification: 0,
    totalPaid: effectiveTotalPaid,
    verifiedBalance,
    outstandingBalance: verifiedBalance,
    pendingBalance: 0,
    paymentStatus
  };
};

export const recordDirectPayment = ({
  orderId,
  amount,
  method, // 'Cash' | 'UPI'
  reference = '',
  referenceNumber = '',
  notes = '',
  recordedBy,
  recordedByName
}) => {
  const order = getDoc('orders', 'orderId', orderId);
  if (!order) throw new Error('Order not found');

  const paymentAmount = Number(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Please specify a valid payment amount greater than zero.');
  }

  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const refString = (reference || referenceNumber || '').trim();

  const userObj = typeof recordedBy === 'string'
    ? { uid: recordedBy, name: recordedByName || recordedBy, role: 'supplier' }
    : {
        uid: recordedBy?.uid || 'guest',
        name: recordedByName || recordedBy?.name || recordedBy?.email || 'User',
        role: recordedBy?.role || 'supplier'
      };

  const newPayment = {
    paymentId,
    orderId,
    supplierId: order.supplierId,
    customerId: order.customerId,
    customerName: order.customerName,
    amount: paymentAmount,
    method,
    reference: refString,
    referenceNumber: refString,
    notes: notes.trim(),
    status: 'Verified', // Auto-verified: removed admin verification permission requirement
    verificationStatus: 'Verified',
    recordedBy: userObj,
    verifiedBy: { uid: 'instant_gateway', name: 'Instant Payment Gateway', role: 'system' },
    paidAt: now,
    verifiedAt: now,
    createdAt: now,
    updatedAt: now
  };

  setDoc('payments', 'paymentId', newPayment);

  // Recalculate order payment balances
  const balances = calculateOutstandingBalance(orderId);
  let newPaymentStatus = balances.paymentStatus;

  // Update order record
  const timelineItem = {
    status: `Payment Received (${method})`,
    time: now,
    note: `₹${paymentAmount} paid via ${method}. Instant confirmation. Ref: ${refString || 'N/A'}`
  };

  updateDoc('orders', 'orderId', orderId, {
    paidAmount: balances.totalPaid,
    outstandingBalance: balances.verifiedBalance,
    paymentStatus: newPaymentStatus,
    timeline: [...(order.timeline || []), timelineItem]
  });

  // Log to audit trail
  logAuditEvent(
    userObj,
    'DIRECT_PAYMENT_RECORDED',
    'payment',
    paymentId,
    { orderId, amount: paymentAmount, method, reference: refString }
  );

  logAuditEvent(
    userObj,
    'PAYMENT_RECORDED',
    'payment',
    paymentId,
    { orderId, amount: paymentAmount, method, reference: refString }
  );

  // Notify Supplier and Admin
  addNotification({
    userId: order.supplierId,
    role: 'supplier',
    title: `Payment Logged for #${orderId} 💰`,
    message: `₹${paymentAmount} via ${method} recorded. Status: Reported.`,
    type: 'payment',
    orderId
  });

  return newPayment;
};

export const verifyPayment = (paymentId, verificationData = {}, reviewer) => {
  const payment = getDoc('payments', 'paymentId', paymentId);
  if (!payment) throw new Error('Payment record not found');

  const now = new Date().toISOString();
  const notes = typeof verificationData === 'string'
    ? verificationData
    : (verificationData?.notes || 'Verified by authorized reviewer');

  const verifier = typeof reviewer === 'string'
    ? { uid: reviewer, name: reviewer, role: 'admin' }
    : {
        uid: reviewer?.uid || 'admin',
        name: reviewer?.name || reviewer?.email || 'Admin',
        role: reviewer?.role || 'admin'
      };

  const updatedPayment = {
    status: 'Verified',
    verificationStatus: 'Verified',
    verifiedBy: verifier,
    verifiedAt: now,
    verificationNotes: notes
  };

  updateDoc('payments', 'paymentId', paymentId, updatedPayment);

  // Log in payment verification history
  const verificationHistoryId = `pvh_${Date.now()}`;
  setDoc('payment_verification_history', 'verificationId', {
    verificationId: verificationHistoryId,
    paymentId,
    orderId: payment.orderId,
    outcome: 'Verified',
    reviewer: verifier,
    notes,
    timestamp: now
  });

  // Recalculate order payment status
  const order = getDoc('orders', 'orderId', payment.orderId);
  if (order) {
    const balances = calculateOutstandingBalance(payment.orderId);
    let orderPayStatus = balances.paymentStatus;

    const timelineItem = {
      status: 'Payment Verified',
      time: now,
      note: `Payment of ₹${payment.amount} (${payment.method}) verified by ${verifier.name}.`
    };

    updateDoc('orders', 'orderId', payment.orderId, {
      outstandingBalance: balances.verifiedBalance,
      paymentStatus: orderPayStatus,
      timeline: [...(order.timeline || []), timelineItem]
    });
  }

  // Log audit
  logAuditEvent(
    verifier,
    'PAYMENT_VERIFIED',
    'payment',
    paymentId,
    { orderId: payment.orderId, amount: payment.amount, outcome: 'Verified' }
  );

  return getDoc('payments', 'paymentId', paymentId);
};

export const disputePayment = (paymentId, disputeReason, actor) => {
  const payment = getDoc('payments', 'paymentId', paymentId);
  if (!payment) throw new Error('Payment record not found');

  const now = new Date().toISOString();
  const reasonText = typeof disputeReason === 'string' ? disputeReason : (disputeReason?.reason || 'Payment contested or unverified');
  const disputer = typeof actor === 'string'
    ? { uid: actor, name: actor, role: 'admin' }
    : {
        uid: actor?.uid || 'admin',
        name: actor?.name || actor?.email || 'Admin',
        role: actor?.role || 'admin'
      };

  const updatedFields = {
    status: 'Disputed',
    verificationStatus: 'Disputed',
    disputeReason: reasonText,
    disputedAt: now,
    disputedBy: disputer
  };

  updateDoc('payments', 'paymentId', paymentId, updatedFields);

  // Log verification history
  setDoc('payment_verification_history', 'verificationId', {
    verificationId: `pvh_${Date.now()}`,
    paymentId,
    orderId: payment.orderId,
    outcome: 'Disputed',
    reviewer: disputer,
    notes: reasonText,
    timestamp: now
  });

  // Update order status
  const order = getDoc('orders', 'orderId', payment.orderId);
  if (order) {
    const balances = calculateOutstandingBalance(payment.orderId);
    updateDoc('orders', 'orderId', payment.orderId, {
      outstandingBalance: balances.verifiedBalance,
      paymentStatus: 'Disputed',
      timeline: [
        ...(order.timeline || []),
        {
          status: 'Payment Disputed',
          time: now,
          note: `Payment ₹${payment.amount} flagged for review: ${reasonText}`
        }
      ]
    });
  }

  // Audit
  logAuditEvent(
    disputer,
    'PAYMENT_DISPUTED',
    'payment',
    paymentId,
    { orderId: payment.orderId, disputeReason: reasonText }
  );

  return getDoc('payments', 'paymentId', paymentId);
};

// ==========================================
// ORDER STATUS & DISPATCH (Section 4 & 7)
// ==========================================

export const updateOrderStatus = (orderId, newStatus, note = '', actor = null) => {
  const order = getDoc('orders', 'orderId', orderId);
  if (!order) throw new Error('Order not found');

  const now = new Date().toISOString();
  const previousStatus = order.orderStatus;

  const newTimelineItem = {
    status: newStatus,
    time: now,
    note: note || `Order updated to ${newStatus}`
  };

  const timeline = [...(order.timeline || []), newTimelineItem];
  const updated = updateDoc('orders', 'orderId', orderId, {
    orderStatus: newStatus,
    timeline
  });

  // Save in order_status_history
  const historyId = `osh_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  setDoc('order_status_history', 'historyId', {
    historyId,
    orderId,
    previousStatus,
    newStatus,
    actor: actor || { uid: 'system', name: 'System', role: 'system' },
    note: note || '',
    timestamp: now
  });

  // Log in Audit Trail
  logAuditEvent(
    actor || { uid: 'system', name: 'System' },
    'ORDER_STATUS_UPDATE',
    'order',
    orderId,
    { previousStatus, newStatus, note }
  );

  // Also update corresponding delivery record if exists
  const delivery = getDoc('deliveries', 'orderId', orderId);
  if (delivery) {
    const deliveryUpdates = { status: newStatus };
    if (newStatus === 'Delivered') {
      deliveryUpdates.deliveredAt = now;
    }
    updateDoc('deliveries', 'orderId', orderId, deliveryUpdates);
  }

  // Create real-time notification for customer
  addNotification({
    userId: order.customerId,
    role: 'customer',
    title: `Order ${newStatus}! 💧`,
    message: `Your order #${orderId} is now ${newStatus}.`,
    type: 'order_update',
    orderId
  });

  // If delivered, update inventory returned & sold
  if (newStatus === 'Delivered') {
    const invList = getCollection('inventory') || [];
    order.items?.forEach(item => {
      const inv = invList.find(i => i.productId === item.productId);
      if (inv) {
        updateDoc('inventory', 'inventoryId', inv.inventoryId, {
          soldQuantity: (inv.soldQuantity || 0) + (Number(item.quantity) || 1),
          availableStock: Math.max(0, (inv.availableStock || 0) - (Number(item.quantity) || 1))
        });
      }
    });
  }

  return updated;
};

// Assign Delivery
export const assignOrderDelivery = (orderId, deliveryPersonName, expectedDeliveryTime, actor = null) => {
  const order = getDoc('orders', 'orderId', orderId);
  if (!order) throw new Error('Order not found');

  updateDoc('orders', 'orderId', orderId, {
    deliveryPerson: deliveryPersonName
  });

  const existingDelivery = getDoc('deliveries', 'orderId', orderId);
  if (existingDelivery) {
    updateDoc('deliveries', 'orderId', orderId, {
      deliveryPersonName,
      expectedDeliveryTime: expectedDeliveryTime || existingDelivery.expectedDeliveryTime,
      assignedAt: new Date().toISOString()
    });
  } else {
    setDoc('deliveries', 'deliveryId', {
      deliveryId: `del_${Date.now()}`,
      orderId,
      supplierId: order.supplierId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryPersonId: 'drv_custom',
      deliveryPersonName,
      deliveryAddress: order.deliveryAddress,
      productSummary: (order.items || []).map(i => `${i.name} × ${i.quantity}`).join(', '),
      status: order.orderStatus,
      expectedDeliveryTime: expectedDeliveryTime || 'Within 2 hours',
      assignedAt: new Date().toISOString(),
      deliveredAt: null
    });
  }

  logAuditEvent(
    actor || { uid: 'system', name: 'Dispatcher' },
    'DELIVERY_ASSIGNED',
    'delivery',
    orderId,
    { deliveryPersonName, expectedDeliveryTime }
  );

  return true;
};

// Add Notification
export const addNotification = (notif) => {
  return setDoc('notifications', 'notificationId', {
    notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...notif
  });
};

// ==========================================
// SUPPLIER SUBSCRIPTION ENGINE (Section 10 & 11)
// ==========================================

export const hasUsedFreeTrial = (email = '', phone = '') => {
  const allUsers = getCollection('users') || [];
  const allSuppliers = getCollection('suppliers') || [];
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').replace(/\D/g, '');

  if (store.trial_registry && Array.isArray(store.trial_registry)) {
    const inRegistry = store.trial_registry.some(r => 
      (cleanEmail && r.email?.toLowerCase() === cleanEmail) ||
      (cleanPhone && cleanPhone.length >= 7 && r.phone?.replace(/\D/g, '') === cleanPhone)
    );
    if (inRegistry) return true;
  }

  const inUsers = allUsers.some(u => 
    u.role === 'supplier' && (u.hasUsedTrial || u.isTrial || u.accountStatus === 'Blocked / Trial Expired') && (
      (cleanEmail && u.email?.toLowerCase() === cleanEmail) ||
      (cleanPhone && cleanPhone.length >= 7 && (u.phone || '').replace(/\D/g, '') === cleanPhone)
    )
  );
  if (inUsers) return true;

  const inSuppliers = allSuppliers.some(s => 
    (s.hasUsedTrial || s.isTrial || s.status === 'Blocked / Trial Expired') && (
      (cleanEmail && s.email?.toLowerCase() === cleanEmail) ||
      (cleanPhone && cleanPhone.length >= 7 && (s.phone || '').replace(/\D/g, '') === cleanPhone)
    )
  );
  return inSuppliers;
};

export const registerTrialUsage = (email = '', phone = '', supplierId = '') => {
  if (!store.trial_registry) store.trial_registry = [];
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').replace(/\D/g, '');

  if (!store.trial_registry.some(r => r.email === cleanEmail && r.phone === cleanPhone)) {
    store.trial_registry.push({
      email: cleanEmail,
      phone: cleanPhone,
      supplierId,
      usedAt: new Date().toISOString()
    });
    saveStore(store);
  }
};

export const getSupplierSubscription = (supplierId) => {
  const subs = getCollection('supplier_subscriptions') || [];
  return subs.find(s => s.supplierId === supplierId) || null;
};

export const checkSupplierSubscriptionValid = (supplierId) => {
  const sub = getSupplierSubscription(supplierId);
  const user = getDoc('users', 'uid', supplierId);

  if (user?.accountStatus === 'Blocked / Trial Expired') {
    return {
      isValid: false,
      status: 'Blocked / Trial Expired',
      planName: user.planName || 'Free Trial (1 Day)',
      daysLeft: 0,
      hoursLeft: 0,
      isExpired: true
    };
  }

  if (!sub) {
    if (user?.hasUsedTrial || user?.isTrial) {
      return {
        isValid: false,
        status: 'Blocked / Trial Expired',
        planName: 'Free Trial (1 Day)',
        daysLeft: 0,
        hoursLeft: 0,
        isExpired: true
      };
    }
    return {
      isValid: true,
      status: 'Active (1-Day Trial)',
      planName: 'Free Trial (1 Day)',
      daysLeft: 1,
      hoursLeft: 24,
      isExpired: false
    };
  }

  const now = new Date();
  const endDate = new Date(sub.endDate);
  const diffTime = endDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.ceil(diffTime / (1000 * 60 * 60));
  const isTrial = sub.isTrial || sub.planId === 'plan_starter' || (sub.planName || '').toLowerCase().includes('trial');

  if (diffTime <= 0) {
    if (isTrial && user?.accountStatus !== 'Blocked / Trial Expired') {
      try {
        updateDoc('users', 'uid', supplierId, { accountStatus: 'Blocked / Trial Expired' });
        updateDoc('suppliers', 'supplierId', supplierId, { status: 'Blocked / Trial Expired' });
      } catch (e) {}
    }

    return {
      isValid: false,
      status: isTrial ? 'Blocked / Trial Expired' : 'Expired',
      planName: sub.planName,
      daysLeft: 0,
      hoursLeft: 0,
      isExpired: true,
      subscription: sub
    };
  }

  return {
    isValid: true,
    status: isTrial ? `Active (Trial: ${hoursLeft}h left)` : (daysLeft <= 7 ? 'Expiring Soon' : 'Active'),
    planName: sub.planName,
    daysLeft,
    hoursLeft,
    isExpired: false,
    subscription: sub
  };
};

export const updateSupplierSubscription = (subscriptionId, updates, actor = null) => {
  const sub = getDoc('supplier_subscriptions', 'subscriptionId', subscriptionId);
  if (!sub) throw new Error('Subscription not found');

  const updated = updateDoc('supplier_subscriptions', 'subscriptionId', subscriptionId, updates);

  logAuditEvent(
    actor || { uid: 'admin_001', name: 'Admin', role: 'admin' },
    'SUBSCRIPTION_UPDATED',
    'subscription',
    subscriptionId,
    { updates }
  );

  return updated;
};

export const renewSupplierSubscription = (supplierId, planId, actor = null) => {
  const plans = getCollection('subscription_plans');
  const plan = plans.find(p => p.planId === planId);
  if (!plan) throw new Error('Subscription plan not found');

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const existingSub = getSupplierSubscription(supplierId);
  const nowIso = now.toISOString();

  if (existingSub) {
    const updated = updateDoc('supplier_subscriptions', 'subscriptionId', existingSub.subscriptionId, {
      planId: plan.planId,
      planName: plan.name,
      amount: plan.price,
      status: 'Active',
      startDate: nowIso,
      endDate: nextMonth.toISOString(),
      paymentHistory: [
        ...(existingSub.paymentHistory || []),
        {
          date: nowIso,
          amount: plan.price,
          reference: `SUB_RENEW_${Date.now()}`,
          status: 'Successful'
        }
      ]
    });

    logAuditEvent(
      actor || { uid: supplierId, role: 'supplier' },
      'SUBSCRIPTION_RENEWED',
      'subscription',
      existingSub.subscriptionId,
      { planId, amount: plan.price }
    );

    return updated;
  } else {
    const newSubId = `sub_${Date.now()}`;
    const newSub = {
      subscriptionId: newSubId,
      supplierId,
      planId: plan.planId,
      planName: plan.name,
      amount: plan.price,
      status: 'Active',
      startDate: nowIso,
      endDate: nextMonth.toISOString(),
      autoRenew: true,
      paymentHistory: [
        {
          date: nowIso,
          amount: plan.price,
          reference: `SUB_NEW_${Date.now()}`,
          status: 'Successful'
        }
      ],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setDoc('supplier_subscriptions', 'subscriptionId', newSub);

    logAuditEvent(
      actor || { uid: supplierId, role: 'supplier' },
      'SUBSCRIPTION_CREATED',
      'subscription',
      newSubId,
      { planId, amount: plan.price }
    );

    return newSub;
  }
};

// Authoritative Server-side Price Calculation (Section 4 & 6)
export const calculateServerOrderTotals = (items = [], deliveryFee = 30) => {
  const catalogProducts = getCollection('products');
  let subtotal = 0;

  const validatedItems = items.map(reqItem => {
    const catalogItem = catalogProducts.find(p => p.productId === reqItem.productId);
    const trustedPrice = catalogItem ? catalogItem.price : (Number(reqItem.price) || 0);
    const qty = Math.max(1, Number(reqItem.quantity) || 1);
    const lineTotal = trustedPrice * qty;
    subtotal += lineTotal;

    const itemImage = catalogItem?.image || reqItem.image || (
      (catalogItem?.name || reqItem.name || '').toLowerCase().includes('cool') ? '/images/cool_water_can.jpg' :
      (catalogItem?.name || reqItem.name || '').toLowerCase().includes('packet') ? '/images/water_pouches_pack.jpg' :
      (catalogItem?.name || reqItem.name || '').toLowerCase().includes('bottle') ? '/images/bottled_water_pack.jpg' :
      '/images/bubble_top_can.jpg'
    );

    return {
      productId: reqItem.productId,
      name: catalogItem ? catalogItem.name : reqItem.name,
      quantity: qty,
      price: trustedPrice,
      image: itemImage,
      unit: catalogItem ? catalogItem.unit : (reqItem.unit || ''),
      lineTotal
    };
  });

  const grandTotal = subtotal + Number(deliveryFee);

  return {
    items: validatedItems,
    subtotal,
    deliveryFee: Number(deliveryFee),
    grandTotal
  };
};

/**
 * Request a new or upgraded supplier subscription plan (Monthly or Yearly)
 */
export const requestSupplierSubscription = ({
  supplierId,
  supplierName,
  planId,
  billingCycle = 'Monthly',
  paymentReference = '',
  amount = 0
}) => {
  const plans = getCollection('subscription_plans');
  const plan = plans.find(p => p.planId === planId) || plans[0];
  const now = new Date();
  const nowIso = now.toISOString();

  // If free plan, active immediately for 1 day trial. If paid, pending admin verification.
  const isFree = amount === 0 || plan.price === 0 || planId === 'plan_starter' || (plan.name || '').toLowerCase().includes('trial');
  const initialStatus = isFree ? 'Active' : 'Pending Verification';

  const expiryDate = new Date(now);
  if (isFree) {
    // 1-Day Free Trial: exactly 24 hours
    expiryDate.setTime(expiryDate.getTime() + 24 * 60 * 60 * 1000);
  } else if (billingCycle === 'Yearly') {
    expiryDate.setDate(expiryDate.getDate() + 365);
  } else {
    expiryDate.setDate(expiryDate.getDate() + 30);
  }

  const subId = `sub_${Date.now()}`;
  const newSub = {
    subscriptionId: subId,
    supplierId,
    supplierName,
    planId: plan.planId,
    planName: isFree ? 'Free Trial (1 Day)' : plan.name,
    billingCycle: isFree ? '1-Day Free Trial' : billingCycle,
    amount: isFree ? 0 : (Number(amount) || (billingCycle === 'Yearly' ? plan.yearlyPrice : plan.monthlyPrice) || 0),
    status: initialStatus,
    isTrial: isFree,
    trialDays: isFree ? 1 : 0,
    startDate: nowIso,
    endDate: expiryDate.toISOString(),
    paymentReference: paymentReference || (isFree ? 'FREE_TRIAL_1DAY' : 'PENDING_REF'),
    paymentMethod: isFree ? 'Free Trial (1 Day)' : 'UPI Platform Direct',
    paymentHistory: [
      {
        date: nowIso,
        amount: isFree ? 0 : (Number(amount) || 0),
        reference: paymentReference || 'FREE_TRIAL_1DAY',
        status: isFree ? 'Successful' : 'Pending Verification'
      }
    ],
    createdAt: nowIso,
    updatedAt: nowIso
  };

  setDoc('supplier_subscriptions', 'subscriptionId', newSub);

  // Link to supplier record
  updateDoc('suppliers', 'supplierId', supplierId, {
    activeSubscriptionId: subId,
    planName: isFree ? 'Free Trial (1 Day)' : plan.name,
    billingCycle: isFree ? '1-Day Free Trial' : billingCycle,
    status: initialStatus === 'Active' ? 'Active' : 'Pending Verification',
    isTrial: isFree,
    trialStartDate: isFree ? nowIso : null,
    trialEndDate: isFree ? expiryDate.toISOString() : null,
    hasUsedTrial: isFree ? true : false
  });

  // Also update user record
  updateDoc('users', 'uid', supplierId, {
    accountStatus: initialStatus === 'Active' ? 'Active' : 'Pending Verification',
    planName: isFree ? 'Free Trial (1 Day)' : plan.name,
    billingCycle: isFree ? '1-Day Free Trial' : billingCycle,
    isTrial: isFree,
    trialStartDate: isFree ? nowIso : null,
    trialEndDate: isFree ? expiryDate.toISOString() : null,
    hasUsedTrial: isFree ? true : false
  });

  if (isFree) {
    const sDoc = getDoc('suppliers', 'supplierId', supplierId);
    registerTrialUsage(sDoc?.email, sDoc?.phone, supplierId);
  }

  logAuditEvent(
    { uid: supplierId, role: 'supplier' },
    'SUPPLIER_PLAN_REQUESTED',
    'subscription',
    subId,
    { planName: plan.name, billingCycle, amount, status: initialStatus, paymentReference }
  );

  return newSub;
};

/**
 * Comprehensive discovery of all pending supplier accounts and subscription approvals.
 * Aggregates across supplier_subscriptions, suppliers, and users collections.
 */
export const getPendingSupplierApprovals = () => {
  const subs = getCollection('supplier_subscriptions') || [];
  const sups = getCollection('suppliers') || [];
  const users = (getCollection('users') || []).filter(u => u.role === 'supplier');
  const deleted = getCollection('deleted_accounts') || [];
  const deletedIds = new Set(deleted.map(d => String(d.userId)));
  const deletedEmails = new Set(deleted.map(d => (d.email || '').toLowerCase().trim()).filter(Boolean));

  const pendingList = [];
  const processedSupplierIds = new Set();

  // 1. Process supplier_subscriptions with Pending status
  subs.forEach(s => {
    const sId = String(s.supplierId || '');
    if ((s.status === 'Pending Verification' || s.status === 'Pending') && !deletedIds.has(sId)) {
      pendingList.push({
        subscriptionId: s.subscriptionId,
        supplierId: s.supplierId,
        supplierName: s.supplierName || 'Water Supplier Plant',
        planName: s.planName || 'Pro Flow Plan',
        billingCycle: s.billingCycle || 'Monthly',
        amount: s.amount || 999,
        paymentReference: s.paymentReference || 'N/A',
        paymentMethod: s.paymentMethod || 'UPI Platform Direct',
        status: 'Pending Verification',
        createdAt: s.createdAt || new Date().toISOString()
      });
      processedSupplierIds.add(sId);
    }
  });

  // 2. Also check suppliers collection for unverified or pending accounts that lack a sub record
  sups.forEach(s => {
    const id = String(s.supplierId || s.id || '');
    if (id && !processedSupplierIds.has(id) && !deletedIds.has(id) && !deletedEmails.has((s.email || '').toLowerCase().trim())) {
      if (s.status === 'Pending Verification' || s.isVerified === false) {
        pendingList.push({
          subscriptionId: s.activeSubscriptionId || `sub_gen_${id}`,
          supplierId: id,
          supplierName: s.businessName || s.plantName || s.ownerName || 'Water Plant',
          planName: s.planName || 'Pro Flow Plan',
          billingCycle: s.billingCycle || 'Monthly',
          amount: s.planName?.toLowerCase().includes('enterprise') ? 2999 : 999,
          paymentReference: s.paymentReference || 'Pending UTR Verification',
          paymentMethod: 'UPI Direct',
          status: 'Pending Verification',
          createdAt: s.createdAt || new Date().toISOString()
        });
        processedSupplierIds.add(id);
      }
    }
  });

  // 3. Also check users collection for supplier accounts with accountStatus 'Pending Verification'
  users.forEach(u => {
    const id = String(u.uid || u.id || '');
    if (id && !processedSupplierIds.has(id) && !deletedIds.has(id) && !deletedEmails.has((u.email || '').toLowerCase().trim())) {
      if (u.accountStatus === 'Pending Verification' || u.isVerified === false) {
        pendingList.push({
          subscriptionId: `sub_gen_${id}`,
          supplierId: id,
          supplierName: u.name || `${u.email}'s Water Plant`,
          planName: u.planName || 'Pro Flow Plan',
          billingCycle: u.billingCycle || 'Monthly',
          amount: u.planName?.toLowerCase().includes('enterprise') ? 2999 : 999,
          paymentReference: 'Pending UTR Verification',
          paymentMethod: 'UPI Direct',
          status: 'Pending Verification',
          createdAt: u.createdAt || new Date().toISOString()
        });
        processedSupplierIds.add(id);
      }
    }
  });

  return pendingList;
};

/**
 * Admin 1-Click Confirmation & Verification of Supplier Plan
 */
export const verifySupplierSubscription = (subscriptionId, adminActor) => {
  let sub = getDoc('supplier_subscriptions', 'subscriptionId', subscriptionId);
  const now = new Date();
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + 30);

  let targetSupplierId = sub?.supplierId;

  // If this was a synthesized ID for an unverified supplier, create the full subscription record
  if (!sub && String(subscriptionId).startsWith('sub_gen_')) {
    targetSupplierId = String(subscriptionId).replace('sub_gen_', '');
    const userDoc = getDoc('users', 'uid', targetSupplierId);
    const suppDoc = getDoc('suppliers', 'supplierId', targetSupplierId);
    const isTrial = (suppDoc?.planName || userDoc?.planName || '').toLowerCase().includes('trial') || 
                    (suppDoc?.billingCycle || userDoc?.billingCycle || '').toLowerCase().includes('trial') ||
                    suppDoc?.isTrial || userDoc?.isTrial || (!suppDoc?.planName && !userDoc?.planName);
    const planName = isTrial ? 'Free Trial (1 Day)' : (suppDoc?.planName || userDoc?.planName || 'Pro Flow Plan');
    const planId = isTrial ? 'plan_starter' : (planName.toLowerCase().includes('enterprise') ? 'plan_enterprise' : 'plan_pro');
    const amount = isTrial ? 0 : (planName.toLowerCase().includes('enterprise') ? 2999 : 999);
    const cycle = isTrial ? '1-Day Free Trial' : (suppDoc?.billingCycle || 'Monthly');
    const trialDays = isTrial ? 1 : 30;
    const expiry = new Date(now);
    expiry.setDate(now.getDate() + (isTrial ? 1 : (cycle === 'Yearly' ? 365 : 30)));
    
    sub = {
      subscriptionId: `sub_${Date.now()}`,
      supplierId: targetSupplierId,
      supplierName: suppDoc?.businessName || userDoc?.name || 'Water Plant',
      planId,
      planName,
      billingCycle: cycle,
      amount,
      status: 'Active',
      isTrial,
      trialDays,
      startDate: now.toISOString(),
      endDate: expiry.toISOString(),
      verifiedAt: now.toISOString(),
      verifiedBy: adminActor?.name || 'Administrator',
      paymentMethod: isTrial ? 'Free Trial (1 Day)' : 'UPI Platform Direct',
      paymentReference: suppDoc?.paymentReference || (isTrial ? 'FREE_TRIAL_1DAY' : 'APPROVED_BY_ADMIN'),
      paymentHistory: [
        {
          date: now.toISOString(),
          amount,
          reference: suppDoc?.paymentReference || (isTrial ? 'FREE_TRIAL_1DAY' : 'APPROVED_BY_ADMIN'),
          status: 'Successful',
          verifiedAt: now.toISOString()
        }
      ],
      createdAt: now.toISOString()
    };
    setDoc('supplier_subscriptions', 'subscriptionId', sub);
  }

  if (sub && !String(subscriptionId).startsWith('sub_gen_')) {
    if (sub.billingCycle === 'Yearly') {
      expiryDate.setDate(now.getDate() + 365);
    }

    updateDoc('supplier_subscriptions', 'subscriptionId', subscriptionId, {
      status: 'Active',
      verifiedAt: now.toISOString(),
      verifiedBy: adminActor?.name || 'Administrator',
      startDate: now.toISOString(),
      endDate: expiryDate.toISOString(),
      paymentHistory: (sub.paymentHistory || []).map(p => ({
        ...p,
        status: 'Successful',
        verifiedAt: now.toISOString()
      }))
    });
  }

  // Activate the supplier & user documents
  if (targetSupplierId) {
    updateDoc('suppliers', 'supplierId', targetSupplierId, {
      status: 'Active',
      isVerified: true
    });
    updateDoc('users', 'uid', targetSupplierId, {
      accountStatus: 'Active',
      isVerified: true
    });

    // Notify Supplier
    addNotification({
      userId: targetSupplierId,
      role: 'supplier',
      title: '🎉 Subscription Verified & Activated!',
      message: `Your account license has been verified by Admin. Full access is now live!`,
      type: 'account_update'
    });
  }

  logAuditEvent(
    adminActor || { uid: 'admin_001', name: 'Admin', role: 'admin' },
    'SUPPLIER_PLAN_VERIFIED',
    'subscription',
    subscriptionId,
    {
      supplierId: sub?.supplierId || targetSupplierId,
      planName: sub?.planName || 'Free Trial (1 Day)',
      billingCycle: sub?.billingCycle || '1-Day Free Trial',
      amount: sub?.amount || 0,
      paymentReference: sub?.paymentReference || 'APPROVED_BY_ADMIN'
    }
  );

  const updatedSub = getDoc('supplier_subscriptions', 'subscriptionId', sub?.subscriptionId || subscriptionId) || sub;
  return updatedSub;
};

/**
 * Retrieve supplier-specific payment details (isolated per supplier)
 */
export const getSupplierPaymentDetails = (supplierId) => {
  const allSuppliers = getCollection('suppliers');
  const allUsers = getCollection('users');
  
  const supplier = allSuppliers.find(s => s.supplierId === supplierId) ||
                   allUsers.find(u => u.uid === supplierId && u.role === 'supplier');

  const plantName = supplier?.businessName || supplier?.plantName || supplier?.name || 'AquaConnect Certified Water Plant';
  const phone = supplier?.upiPhoneNumber || supplier?.phone || '+91 98765 43210';
  
  // Format clean UPI ID specific to this supplier
  let upiId = supplier?.upiId;
  if (!upiId) {
    const safeTag = (supplier?.businessName || supplier?.name || 'plant').toLowerCase().replace(/[^a-z0-9]/g, '');
    upiId = `${safeTag}.water@upi`;
  }

  // Generate dynamic QR Code string and live QR Image URL
  const generateQrUrl = (amount = 0) => {
    if (supplier?.qrCodeUrl && supplier.qrCodeUrl.trim().length > 5) {
      return supplier.qrCodeUrl;
    }
    const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(plantName)}${amount > 0 ? `&am=${amount}` : ''}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
  };

  return {
    supplierId,
    plantName,
    ownerName: supplier?.ownerName || supplier?.name || 'Water Plant Owner',
    upiId,
    upiPhoneNumber: phone,
    codEnabled: supplier?.codEnabled !== false,
    upiEnabled: supplier?.upiEnabled !== false,
    qrCodeUrl: supplier?.qrCodeUrl || '',
    generateQrUrl
  };
};

/**
 * Real-time synchronization of subscription plans and platform settings to Firestore
 */
export const syncPlatformConfigToFirestore = () => {
  if (isLiveFirebaseConfigured() && db) {
    try {
      const configRef = doc(db, 'users', 'platform_config');
      fbSetDoc(configRef, {
        uid: 'platform_config',
        role: 'platform_system',
        subscription_plans: sanitizeForFirestore(store.subscription_plans || []),
        platform_settings: sanitizeForFirestore(store.platform_settings || getPlatformSettings()),
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn("Could not sync platform config to Firestore:", err.message);
      });
    } catch (e) {
      console.warn("syncPlatformConfigToFirestore error:", e);
    }
  }
};

/**
 * Retrieve Platform Subscription Payment Settings & QR
 */
export const getPlatformSettings = () => {
  return store.platform_settings || SEED_DATA.platform_settings || {
    id: 'platform_settings',
    adminUpiId: 'aquaconnect.admin@upi',
    adminPhone: '8522828688',
    adminQrCodeUrl: '',
    customerCarePhone: '+91 85228 28688',
    customerCareEmail: 'support@aquaconnect.com',
    customerCareWhatsapp: '+91 85228 28688',
    customerCareHours: '9:00 AM - 8:00 PM (Mon-Sat)'
  };
};

/**
 * Update Platform Subscription Payment Settings (Admin QR / UPI / Customer Care)
 */
export const updatePlatformSettings = (newSettings) => {
  store.platform_settings = {
    ...getPlatformSettings(),
    ...newSettings,
    updatedAt: new Date().toISOString()
  };
  saveStore(store);
  notifyListeners('platform_settings');
  notifyListeners('all');
  syncPlatformConfigToFirestore();
  return store.platform_settings;
};

/**
 * Admin action to toggle Verified status for any supplier / water plant account
 */
export const toggleSupplierVerification = (supplierId, shouldVerify = true) => {
  const sup = getDoc('suppliers', 'supplierId', supplierId);
  if (sup) {
    updateDoc('suppliers', 'supplierId', supplierId, {
      isVerified: shouldVerify,
      status: 'Active',
      updatedAt: new Date().toISOString()
    });
  }
  const allUsers = getCollection('users') || [];
  const u = allUsers.find(user => 
    user.uid === supplierId || 
    user.id === supplierId || 
    (sup && user.email === sup.email) || 
    (sup && user.phone === sup.phone)
  );
  if (u) {
    updateDoc('users', 'uid', u.uid || u.id, {
      isVerified: shouldVerify,
      status: 'Active',
      accountStatus: 'Active',
      updatedAt: new Date().toISOString()
    });
  }

  // Also activate any pending subscription for this supplier
  if (shouldVerify) {
    const subs = store.supplier_subscriptions || [];
    const pendingSub = subs.find(s => s.supplierId === supplierId && (s.status === 'Pending Verification' || s.status === 'Pending'));
    if (pendingSub) {
      updateDoc('supplier_subscriptions', 'subscriptionId', pendingSub.subscriptionId, {
        status: 'Active',
        verifiedAt: new Date().toISOString()
      });
    }
  }

  notifyListeners('supplier_subscriptions');
  notifyListeners('suppliers');
  notifyListeners('users');
  notifyListeners('all');
  return { isVerified: shouldVerify };
};

/**
 * Admin action to Temporarily Stop / Suspend or Resume / Reactivate any Supplier or Customer account
 * Allows Admin to stop access temporarily and later continue as usual without data loss.
 */
export const toggleAccountSuspension = (userId, role = 'supplier', shouldSuspend = true, adminActor = null, reason = '') => {
  const allUsers = getCollection('users') || [];
  const targetUser = allUsers.find(user => 
    String(user.uid) === String(userId) || 
    String(user.id) === String(userId) || 
    (user.email && String(user.email).toLowerCase() === String(userId).toLowerCase())
  );

  const statusToApply = shouldSuspend ? 'Suspended' : 'Active';
  const now = new Date().toISOString();

  // 1. Update user document
  if (targetUser) {
    updateDoc('users', 'uid', targetUser.uid || targetUser.id, {
      accountStatus: statusToApply,
      status: statusToApply,
      isSuspended: shouldSuspend,
      suspendedAt: shouldSuspend ? now : null,
      resumedAt: shouldSuspend ? null : now,
      suspensionReason: shouldSuspend ? (reason || 'Temporarily stopped by administrator') : null,
      updatedAt: now
    });
  }

  // 2. If supplier, update suppliers and subscriptions
  if (role === 'supplier' || targetUser?.role === 'supplier') {
    const sup = getDoc('suppliers', 'supplierId', userId) || 
                (targetUser ? getDoc('suppliers', 'supplierId', targetUser.uid) : null);
    if (sup) {
      updateDoc('suppliers', 'supplierId', sup.supplierId, {
        status: statusToApply,
        accountStatus: statusToApply,
        isSuspended: shouldSuspend,
        suspendedAt: shouldSuspend ? now : null,
        resumedAt: shouldSuspend ? null : now,
        updatedAt: now
      });
    }

    const supSubs = store.supplier_subscriptions || [];
    supSubs
      .filter(s => s.supplierId === userId || (targetUser && s.supplierId === targetUser.uid))
      .forEach(s => {
        updateDoc('supplier_subscriptions', 'subscriptionId', s.subscriptionId, {
          status: statusToApply,
          isSuspended: shouldSuspend,
          updatedAt: now
        });
      });
  }

  // 3. If customer, update customers collection
  if (role === 'customer' || targetUser?.role === 'customer') {
    const cust = getDoc('customers', 'customerId', userId) || 
                 (targetUser ? getDoc('customers', 'customerId', targetUser.uid) : null);
    if (cust) {
      updateDoc('customers', 'customerId', cust.customerId, {
        status: statusToApply,
        accountStatus: statusToApply,
        isSuspended: shouldSuspend,
        suspendedAt: shouldSuspend ? now : null,
        resumedAt: shouldSuspend ? null : now,
        updatedAt: now
      });
    }

    const custSubs = store.customer_subscriptions || [];
    custSubs
      .filter(s => s.customerId === userId || (targetUser && s.customerId === targetUser.uid))
      .forEach(s => {
        updateDoc('customer_subscriptions', 'subscriptionId', s.subscriptionId, {
          status: statusToApply,
          isSuspended: shouldSuspend,
          updatedAt: now
        });
      });
  }

  // 4. Log in Audit Trail
  const accountName = targetUser?.businessName || targetUser?.name || userId;
  logAuditEvent(
    adminActor || { uid: 'admin', name: 'Platform Admin', role: 'admin', email: 'admin@aquaconnect.com' },
    shouldSuspend ? 'ACCOUNT_TEMPORARILY_STOPPED' : 'ACCOUNT_RESUMED',
    role === 'supplier' ? 'supplier' : 'customer',
    userId,
    {
      accountName,
      status: statusToApply,
      reason: reason || (shouldSuspend ? 'Temporarily stopped by administrator' : 'Reactivated to continue as usual')
    }
  );

  saveStore(store);
  notifyListeners('supplier_subscriptions');
  notifyListeners('customer_subscriptions');
  notifyListeners('suppliers');
  notifyListeners('customers');
  notifyListeners('users');
  notifyListeners('audit_logs');
  notifyListeners('all');

  return { success: true, status: statusToApply, isSuspended: shouldSuspend };
};

/**
 * Admin action to Create a New Subscription Plan (Supplier or Customer)
 * Supports Draft & Published states per PRD Section 3 & 5
 */
export const createSubscriptionPlan = (planData, adminActor = null) => {
  if (!store.subscription_plans) {
    store.subscription_plans = JSON.parse(JSON.stringify(SEED_DATA.subscription_plans));
  }

  const planId = planData.planId || `plan_${(planData.targetRole || 'plan')}_${Date.now()}`;
  const newPlan = {
    planId,
    targetRole: planData.targetRole || 'supplier', // 'supplier' | 'customer'
    name: planData.name || 'Untitled Plan',
    monthlyPrice: Number(planData.monthlyPrice) || 0,
    yearlyPrice: Number(planData.yearlyPrice) || (Number(planData.monthlyPrice) * 10) || 0,
    price: Number(planData.monthlyPrice) || 0,
    billingCycle: planData.billingCycle || 'Monthly or Yearly',
    trialDays: Number(planData.trialDays) || 0,
    status: planData.status || 'draft', // 'draft' | 'published'
    orderLimit: planData.orderLimit !== undefined ? planData.orderLimit : null,
    features: Array.isArray(planData.features) ? planData.features : [],
    featureFlags: planData.featureFlags || {},
    limits: planData.limits || {},
    isPopular: !!planData.isPopular,
    isActive: planData.isActive !== undefined ? planData.isActive : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminActor?.email || adminActor?.name || 'Administrator'
  };

  store.subscription_plans.push(newPlan);
  saveStore(store);
  notifyListeners('subscription_plans');
  syncPlatformConfigToFirestore();

  logAuditEvent(
    adminActor || { uid: 'admin_001', name: 'Admin', role: 'admin' },
    'SUBSCRIPTION_PLAN_CREATED',
    'subscription_plan',
    planId,
    {
      name: newPlan.name,
      targetRole: newPlan.targetRole,
      status: newPlan.status,
      monthlyPrice: newPlan.monthlyPrice
    }
  );

  return newPlan;
};

/**
 * Admin action to Edit Subscription Plan details
 */
export const updateSubscriptionPlan = (planId, updatedFields, adminActor = null) => {
  if (!store.subscription_plans) {
    store.subscription_plans = JSON.parse(JSON.stringify(SEED_DATA.subscription_plans));
  }
  const index = store.subscription_plans.findIndex(p => p.planId === planId);
  if (index === -1) throw new Error('Subscription plan not found');

  const prev = store.subscription_plans[index];
  store.subscription_plans[index] = {
    ...prev,
    ...updatedFields,
    updatedAt: new Date().toISOString()
  };

  saveStore(store);
  notifyListeners('subscription_plans');
  syncPlatformConfigToFirestore();

  logAuditEvent(
    adminActor || { uid: 'admin_001', name: 'Admin', role: 'admin' },
    'SUBSCRIPTION_PLAN_UPDATED',
    'subscription_plan',
    planId,
    {
      name: store.subscription_plans[index].name,
      targetRole: store.subscription_plans[index].targetRole,
      status: store.subscription_plans[index].status,
      changedKeys: Object.keys(updatedFields)
    }
  );

  return store.subscription_plans[index];
};

/**
 * Explicit Publish Action (Draft -> Published Live)
 */
export const publishSubscriptionPlan = (planId, adminActor = null) => {
  return updateSubscriptionPlan(planId, { status: 'published', publishedAt: new Date().toISOString() }, adminActor);
};

/**
 * Admin action to delete a Subscription Plan
 */
export const deleteSubscriptionPlan = (planId, adminActor = null) => {
  if (!store.subscription_plans) return false;
  const index = store.subscription_plans.findIndex(p => p.planId === planId);
  if (index === -1) return false;

  const deleted = store.subscription_plans.splice(index, 1)[0];
  saveStore(store);
  notifyListeners('subscription_plans');
  syncPlatformConfigToFirestore();

  logAuditEvent(
    adminActor || { uid: 'admin_001', name: 'Admin', role: 'admin' },
    'SUBSCRIPTION_PLAN_DELETED',
    'subscription_plan',
    planId,
    { name: deleted.name, targetRole: deleted.targetRole }
  );

  return true;
};

/**
 * Admin action to directly assign / change a customer's subscription plan
 */
export const assignCustomerPlan = (customerId, planId, billingCycle = 'Monthly', adminActor = null) => {
  const plan = (store.subscription_plans || []).find(p => p.planId === planId);
  if (!plan) throw new Error('Customer plan not found');

  const customer = getDoc('customers', 'customerId', customerId);
  const now = new Date();
  const expiryDate = new Date(now);
  if (billingCycle === 'Yearly') {
    expiryDate.setDate(expiryDate.getDate() + 365);
  } else {
    expiryDate.setDate(expiryDate.getDate() + 30);
  }

  const amount = billingCycle === 'Yearly' ? (plan.yearlyPrice || plan.price * 10) : (plan.monthlyPrice || plan.price);

  if (!store.customer_subscriptions) {
    store.customer_subscriptions = JSON.parse(JSON.stringify(SEED_DATA.customer_subscriptions || []));
  }

  let sub = store.customer_subscriptions.find(s => s.customerId === customerId);
  const nowIso = now.toISOString();

  if (sub) {
    sub.planId = plan.planId;
    sub.planName = plan.name;
    sub.billingCycle = billingCycle;
    sub.amount = amount;
    sub.status = 'Active';
    sub.startDate = nowIso;
    sub.endDate = expiryDate.toISOString();
    sub.updatedAt = nowIso;
    sub.verifiedBy = adminActor?.name || 'Administrator';
  } else {
    sub = {
      subscriptionId: `csub_${Date.now()}`,
      customerId,
      customerName: customer?.name || 'Customer',
      customerPhone: customer?.phone || '',
      planId: plan.planId,
      planName: plan.name,
      amount,
      status: 'Active',
      billingCycle,
      startDate: nowIso,
      endDate: expiryDate.toISOString(),
      autoRenew: true,
      paymentMethod: 'Admin Override',
      paymentReference: 'ADMIN_ASSIGNED',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    store.customer_subscriptions.push(sub);
  }

  // Update customer document
  updateDoc('customers', 'customerId', customerId, {
    planName: plan.name,
    isSubscriber: true,
    subscriptionStatus: 'Active'
  });

  saveStore(store);
  notifyListeners('customers');
  notifyListeners('customer_subscriptions');

  logAuditEvent(
    adminActor || { uid: 'admin_001', name: 'Admin', role: 'admin' },
    'CUSTOMER_PLAN_ASSIGNED',
    'subscription',
    sub.subscriptionId,
    { customerId, planName: plan.name, billingCycle, amount }
  );

  return sub;
};

/**
 * Admin action to toggle / update customer subscription status
 */
export const updateCustomerSubscription = (subscriptionId, updatedFields, adminActor = null) => {
  if (!store.customer_subscriptions) {
    store.customer_subscriptions = JSON.parse(JSON.stringify(SEED_DATA.customer_subscriptions || []));
  }
  const index = store.customer_subscriptions.findIndex(s => s.subscriptionId === subscriptionId);
  if (index === -1) throw new Error('Customer subscription not found');

  store.customer_subscriptions[index] = {
    ...store.customer_subscriptions[index],
    ...updatedFields,
    updatedAt: new Date().toISOString()
  };

  saveStore(store);
  notifyListeners('customer_subscriptions');

  logAuditEvent(
    adminActor || { uid: 'admin_001', name: 'Admin', role: 'admin' },
    'CUSTOMER_SUBSCRIPTION_UPDATED',
    'subscription',
    subscriptionId,
    updatedFields
  );

  return store.customer_subscriptions[index];
};

/**
 * Admin action to directly assign / change a supplier's plan and credentials
 */
export const assignSupplierPlan = (supplierId, planId, billingCycle = 'Monthly', adminActor = null) => {
  const plan = (store.subscription_plans || []).find(p => p.planId === planId);
  if (!plan) throw new Error('Plan not found');

  const now = new Date();
  const expiryDate = new Date(now);
  if (billingCycle === 'Yearly') {
    expiryDate.setDate(expiryDate.getDate() + 365);
  } else {
    expiryDate.setDate(expiryDate.getDate() + 30);
  }

  const amount = billingCycle === 'Yearly' ? (plan.yearlyPrice || plan.price * 10) : (plan.monthlyPrice || plan.price);

  // Update existing subscription or create new
  const existingSub = (store.supplier_subscriptions || []).find(s => s.supplierId === supplierId);
  if (existingSub) {
    updateDoc('supplier_subscriptions', 'subscriptionId', existingSub.subscriptionId, {
      planId: plan.planId,
      planName: plan.name,
      billingCycle,
      amount,
      status: 'Active',
      startDate: now.toISOString(),
      endDate: expiryDate.toISOString(),
      verifiedAt: now.toISOString(),
      verifiedBy: adminActor?.name || 'Administrator'
    });
  } else {
    requestSupplierSubscription({
      supplierId,
      supplierName: getDoc('suppliers', 'supplierId', supplierId)?.businessName || 'Supplier',
      planId,
      billingCycle,
      paymentReference: 'ADMIN_OVERRIDE',
      amount
    });
    const createdSub = (store.supplier_subscriptions || []).find(s => s.supplierId === supplierId);
    if (createdSub) {
      verifySupplierSubscription(createdSub.subscriptionId, adminActor);
    }
  }

  // Update supplier document and user document
  updateDoc('suppliers', 'supplierId', supplierId, {
    planName: plan.name,
    billingCycle,
    status: 'Active',
    isVerified: true
  });
  updateDoc('users', 'uid', supplierId, {
    planName: plan.name,
    billingCycle,
    accountStatus: 'Active',
    isVerified: true
  });

  saveStore(store);
  notifyListeners('suppliers');
  notifyListeners('users');
  notifyListeners('supplier_subscriptions');
  return true;
};
