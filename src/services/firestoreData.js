
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
/**
 * AquaConnect Firestore Data Engine & Realtime Sync Service
 * Manages full CRUD operations, live snapshot subscriptions, local persistence,
 * and seamless fallback when offline or before remote Firestore keys are entered.
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
import { db, isLiveFirebaseConfigured } from './firebase';

const ID_FIELD_MAP = {
  users: 'uid',
  suppliers: 'supplierId',
  products: 'productId',
  customers: 'customerId',
  orders: 'orderId',
  deliveries: 'deliveryId',
  inventory: 'inventoryId',
  notifications: 'notificationId',
  payments: 'paymentId'
};


// Initial Seed Data matching the user's business requirements
const SEED_DATA = {
  users: [],

  suppliers: [],

  products: [
    {
      productId: 'prod_001',
      supplierId: 'sup_001',
      name: '20L Normal RO Water Can',
      description: 'Standard 20 Litre purified RO+UV mineral water in returnable plastic can.',
      price: 50,
      image: 'https://5.imimg.com/data5/AP/MU/MY-4515526/20-litre-can-jug-jar-dispenser-500x500.jpg',
      stock: 85,
      unit: '20L',
      containerType: 'Returnable Jar',
      isActive: true,
      createdAt: '2026-01-11T10:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      productId: 'prod_002',
      supplierId: 'sup_001',
      name: '20L Cool / Chilled Water Can',
      description: 'Chilled 20 Litre purified mineral water insulated camper can with tap.',
      price: 65,
      image: 'https://5.imimg.com/data5/SELLER/Default/2021/4/AM/HZ/GJ/35689307/20ltres-cool-can-1--500x500.jpeg',
      stock: 50,
      unit: '20L Chilled',
      containerType: 'Returnable Jar',
      isActive: true,
      createdAt: '2026-01-11T10:30:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      productId: 'prod_003',
      supplierId: 'sup_001',
      name: 'Drinking Water Packets (50 Pouches)',
      description: 'Bundle of 50 hygienic 250ml sealed drinking water pouches.',
      price: 75,
      image: 'https://5.imimg.com/data5/SELLER/Default/2024/3/401402931/HR/MG/JG/11262634/ldpe-packed-drinking-water-pouch-500x500.jpg',
      stock: 60,
      unit: '250ml x 50',
      containerType: 'Water Packet',
      isActive: true,
      createdAt: '2026-01-12T11:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    },
    {
      productId: 'prod_004',
      supplierId: 'sup_001',
      name: '1L Water Bottles (Box of 12)',
      description: 'Carton of twelve 1 Litre packaged natural mineral water plastic bottles.',
      price: 180,
      image: 'https://5.imimg.com/data5/SELLER/Default/2022/11/NF/WB/JJ/45711328/1-litre-packed-drinking-water-bottle-500x500.jpg',
      stock: 45,
      unit: '1L x 12',
      containerType: 'Packaged Box',
      isActive: true,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z'
    }
  ],

  customers: [],

  orders: [],
  deliveries: [],
  inventory: [],
  notifications: []
};

const STORAGE_KEY = 'aquaconnect_firestore_db_v2';

// Event listeners for reactive cross-component communication
const listeners = new Set();

const notifyListeners = (collection) => {
  listeners.forEach(callback => {
    try {
      callback(collection);
    } catch (e) {
      console.error("Listener callback error:", e);
    }
  });
};

export const subscribeToData = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

// Load or initialize state
const loadStore = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('aquaconnect_firestore_db_v1');
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
    const parsed = JSON.parse(raw);
    // Sanitize in case older dummy orders/deliveries lingered
    if (parsed.orders && parsed.orders.some(o => o.orderId === 'AC1025' || o.orderId === 'AC1024')) {
      parsed.orders = [];
      parsed.deliveries = [];
      parsed.notifications = [];
      parsed.customers = [];
      parsed.users = [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    // Filter out email testing account orders and lingering testing suppliers
    if (parsed.orders && parsed.orders.length > 0) {
      parsed.orders = parsed.orders.filter(o => !isEmailAccountOrder(o));
    }
    if (parsed.suppliers && parsed.suppliers.length > 0) {
      parsed.suppliers = parsed.suppliers.filter(s => {
        const n = (s.businessName || s.ownerName || s.name || '').toLowerCase();
        const e = (s.email || '').toLowerCase();
        return !n.includes('paddu') && !n.includes('jaya') && !e.includes('paddu') && !e.includes('jaya') && !n.includes('@');
      });
    }
    return parsed;
  } catch (e) {
    console.warn("Could not load from localStorage, using memory seed:", e);
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
};

const saveStore = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

// Firestore Collection Live Sync Listeners
const activeUnsubscribes = [];

export const initFirestoreLiveSync = () => {
  if (!isLiveFirebaseConfigured() || !db) {
    return;
  }

  // Clear existing listeners
  activeUnsubscribes.forEach(unsub => unsub && unsub());
  activeUnsubscribes.length = 0;

  const collections = ['users', 'suppliers', 'products', 'customers', 'orders', 'deliveries', 'inventory', 'notifications'];

  collections.forEach(colName => {
    try {
      const colRef = collection(db, colName);
      const unsub = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const idField = ID_FIELD_MAP[colName] || 'id';
          const remoteItems = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            if (!data[idField]) {
              data[idField] = docSnap.id;
            }
            return data;
          });

          store[colName] = remoteItems;
          saveStore(store);
          notifyListeners(colName);
        }
      }, (error) => {
        console.warn(`Firestore onSnapshot warning for ${colName}:`, error.message);
      });
      activeUnsubscribes.push(unsub);
    } catch (e) {
      console.warn(`Could not attach listener for ${colName}:`, e);
    }
  });
};

// Auto-initialize real-time sync if live Firebase is active
if (typeof window !== 'undefined' && isLiveFirebaseConfigured()) {
  initFirestoreLiveSync();
}

// Seed Live Firestore Database with Initial Data
export const seedLiveFirestore = async () => {
  if (!isLiveFirebaseConfigured() || !db) {
    throw new Error("Live Firebase is not configured. Please fill in your .env.local credentials first.");
  }

  const collections = ['users', 'suppliers', 'products', 'customers', 'orders', 'deliveries', 'inventory', 'notifications'];
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
  return list.find(item => item[idField] === idValue) || null;
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
  const index = store[collectionName].findIndex(item => item[idField] === docData[idField]);
  if (index >= 0) {
    store[collectionName][index] = { ...store[collectionName][index], ...docData, updatedAt: new Date().toISOString() };
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
        console.warn(`Firestore setDoc sync warning (${collectionName}):`, err.message);
      });
    } catch (err) {
      console.warn(`Firestore setDoc sync error (${collectionName}):`, err);
    }
  }

  return docData;
};

export const updateDoc = (collectionName, idField, idValue, updates) => {
  if (!store[collectionName]) return null;
  const index = store[collectionName].findIndex(item => item[idField] === idValue);
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
          console.warn(`Firestore updateDoc sync warning (${collectionName}):`, err.message);
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
  store[collectionName] = store[collectionName].filter(item => item[idField] !== idValue);
  if (store[collectionName].length !== initialLen) {
    saveStore(store);
    notifyListeners(collectionName);

    // Asynchronous sync to live Firestore backend
    if (isLiveFirebaseConfigured() && db && idValue) {
      try {
        const docRef = doc(db, collectionName, String(idValue));
        fbDeleteDoc(docRef).catch(err => {
          console.warn(`Firestore deleteDoc sync warning (${collectionName}):`, err.message);
        });
      } catch (err) {
        console.warn(`Firestore deleteDoc sync error (${collectionName}):`, err);
      }
    }

    return true;
  }
  return false;
};

export const deleteOrder = (orderId) => {
  return deleteDoc('orders', 'orderId', orderId);
};

export const deleteCustomer = (customerId) => {
  if (!customerId) return false;
  const deletedById = deleteDoc('customers', 'customerId', customerId);
  const deletedByUserId = deleteDoc('customers', 'userId', customerId);
  return deletedById || deletedByUserId;
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

// Specialized Business Actions

// Order Status Transitions
export const updateOrderStatus = (orderId, newStatus, note = '') => {
  const order = getDoc('orders', 'orderId', orderId);
  if (!order) throw new Error('Order not found');

  const newTimelineItem = {
    status: newStatus,
    time: new Date().toISOString(),
    note: note || `Order updated to ${newStatus}`
  };

  const timeline = [...(order.timeline || []), newTimelineItem];
  const updated = updateDoc('orders', 'orderId', orderId, {
    orderStatus: newStatus,
    timeline
  });

  // Also update corresponding delivery record if exists
  const delivery = getDoc('deliveries', 'orderId', orderId);
  if (delivery) {
    const deliveryUpdates = { status: newStatus };
    if (newStatus === 'Delivered') {
      deliveryUpdates.deliveredAt = new Date().toISOString();
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
    order.items?.forEach(item => {
      const inv = store.inventory.find(i => i.productId === item.productId);
      if (inv) {
        updateDoc('inventory', 'inventoryId', inv.inventoryId, {
          soldQuantity: (inv.soldQuantity || 0) + item.quantity,
          availableStock: Math.max(0, (inv.availableStock || 0) - item.quantity)
        });
      }
    });
  }

  return updated;
};

// Assign Delivery
export const assignOrderDelivery = (orderId, deliveryPersonName, expectedDeliveryTime) => {
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
      productSummary: order.items.map(i => `${i.name} × ${i.quantity}`).join(', '),
      status: order.orderStatus,
      expectedDeliveryTime: expectedDeliveryTime || 'Within 2 hours',
      assignedAt: new Date().toISOString(),
      deliveredAt: null
    });
  }

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
