import { getCollection } from '../services/firestoreData.js';

/**
 * Proximity score calculation between customer and supplier locations.
 * Higher score = higher confidence locality match.
 */
export const calculateLocationScore = ({
  customerAddress = '',
  customerCity = '',
  supplierAddress = '',
  supplierCity = '',
  deliveryAreas = []
}) => {
  const custAddr = (customerAddress || '').toLowerCase().trim();
  const suppAddr = (supplierAddress || '').toLowerCase().trim();
  const custC = (customerCity || '').toLowerCase().trim();
  const suppC = (supplierCity || '').toLowerCase().trim();

  if (!custAddr && !suppAddr) return 0;

  let score = 0;

  // 0. Explicit custom delivery areas configured by supplier
  if (Array.isArray(deliveryAreas) && deliveryAreas.length > 0) {
    for (const area of deliveryAreas) {
      const a = (area || '').toLowerCase().trim();
      if (a && (custAddr.includes(a) || a.includes(custAddr))) {
        score += 35; // Direct match with manually entered serviced zone!
      }
    }
  }

  if (!custAddr || !suppAddr) return score;

  // 1. PIN code matching (6-digit Indian postal code)
  const pinRegex = /\b\d{6}\b/g;
  const custPins = new Set(custAddr.match(pinRegex) || []);
  const suppPins = new Set(suppAddr.match(pinRegex) || []);
  for (const pin of custPins) {
    if (suppPins.has(pin)) {
      score += 25;
    }
  }

  // 2. Direct substring match of full address or locality
  if (custAddr.length > 3 && suppAddr.length > 3) {
    if (custAddr.includes(suppAddr) || suppAddr.includes(custAddr)) {
      score += 15;
    }
  }

  // 3. Regional Clusters (Town/mandal groupings to ensure proper geographical isolation)
  const regionalClusters = [
    // 0: Proddatur / Kadapa District Region
    new Set([
      'proddatur', 'kottala', 'bollavaram', 'korrapadu', 'mydukur',
      'jammalamadugu', 'chagalamarri', 'kadapa', 'cuddapah', 'rajampet',
      'pulivendula', 'badvel', 'kamalapuram',
      '516360', '516361', '516362', '516001', '516002', '516003', '516004'
    ]),
    // 1: Nandyal District Region (Panyam, Balapanur, Banaganapalle, Allagadda, Vaddagandla, NH40, Betamcherla)
    new Set([
      'nandyal', 'panyam', 'paniem', 'balapanur', 'banaganapalle', 'allagadda',
      'vaddagandla', 'nh40', 'betamcherla', 'nandikotkur', 'atmakur', 'srisailam', 'koilkuntla',
      '518112', '518501', '518502', '518503', '518504', '518511', '518543'
    ]),
    // 2: Kurnool Region
    new Set([
      'kurnool', 'dhone', 'alur', 'adoni', 'yemmiganur', 'pattikonda', 'kodumur',
      '518001', '518002', '518003', '518004'
    ]),
    // 3: Hyderabad / Cyberabad Region
    new Set([
      'hyderabad', 'secunderabad', 'gachibowli', 'hitec city', 'whitefields',
      'kondapur', 'madhapur', 'kukatpally', 'jubilee hills', 'banjara hills',
      'manikonda', 'miyapur', 'lingampally', 'chandanagar', 'begumpet',
      'ameerpet', 'financial district', '500032', '500081', '500084'
    ])
  ];

  const allSuppTokens = new Set(
    suppAddr
      .split(/[\s,./#\-_]+/)
      .filter(w => w.length >= 3)
  );
  if (suppC && suppC !== 'hyderabad') allSuppTokens.add(suppC);
  if (Array.isArray(deliveryAreas)) {
    for (const a of deliveryAreas) {
      for (const tok of (a || '').toLowerCase().split(/[\s,./#\-_]+/).filter(w => w.length >= 3)) {
        allSuppTokens.add(tok);
      }
    }
  }

  const custTokensRaw = new Set(
    custAddr
      .split(/[\s,./#\-_]+/)
      .filter(w => w.length >= 3)
  );
  if (custC) custTokensRaw.add(custC);

  let custClusterIndex = null;
  let suppClusterIndex = null;

  regionalClusters.forEach((cluster, idx) => {
    for (const tok of custTokensRaw) {
      if (cluster.has(tok)) custClusterIndex = idx;
    }
    for (const tok of allSuppTokens) {
      if (cluster.has(tok)) suppClusterIndex = idx;
    }
  });

  // STRICT CROSS-CLUSTER ISOLATION:
  // If customer belongs to Cluster A and supplier belongs to Cluster B (A != B),
  // they are in completely separate geographic territories (e.g. Nandyal vs Proddatur).
  // Under no circumstances can they service each other across different regions!
  if (custClusterIndex !== null && suppClusterIndex !== null && custClusterIndex !== suppClusterIndex) {
    return 0;
  }

  if (custClusterIndex !== null && suppClusterIndex !== null && custClusterIndex === suppClusterIndex) {
    score += 35;
  }

  // 4. Significant locality keyword extraction (excluding common address boilerplate)
  const genericTokens = new Set([
    'road', 'street', 'lane', 'avenue', 'near', 'beside', 'opposite', 'opp',
    'behind', 'plot', 'flat', 'house', 'building', 'door', 'floor', 'block',
    'sector', 'phase', 'apartment', 'apartments', 'colony', 'nagar', 'city',
    'layout', 'enclave', 'town', 'cross', 'main', 'india', 'telangana', 'andhra',
    'pradesh', 'water', 'plant', 'hub', 'point', 'supply', 'supplier', 'station',
    'distributor', 'agency', 'services', 'and', 'the', 'for'
  ]);

  const custTokens = new Set(
    custAddr
      .split(/[\s,./#\-_]+/)
      .filter(w => w.length >= 3 && !genericTokens.has(w))
  );

  const suppTokens = new Set(
    suppAddr
      .split(/[\s,./#\-_]+/)
      .filter(w => w.length >= 3 && !genericTokens.has(w))
  );

  for (const tok of custTokens) {
    if (suppTokens.has(tok)) {
      score += 10;
    }
  }

  // 5. City match (bonus only if both specify non-empty specific city)
  if (custC && suppC && custC === suppC && custC !== 'hyderabad' && custC !== 'india') {
    score += 10;
  }

  return score;
};

export const isLocationMatch = (params) => {
  return calculateLocationScore(params) >= 8;
};

/**
 * Returns suppliers servicing the given customer delivery address, ordered by closest match.
 */
export const findSurroundingSuppliers = (customerAddress = '', customerCity = '') => {
  const allUsers = (getCollection('users') || []).filter(u => 
    u.role === 'supplier' && 
    u.accountStatus !== 'Deleted from Backend' && 
    u.accountStatus !== 'Suspended' && 
    u.status !== 'Suspended' && 
    !u.isSuspended
  );
  const allSuppliers = (getCollection('suppliers') || []).filter(s => 
    s.status !== 'Deleted from Backend' && 
    s.status !== 'Suspended' && 
    s.accountStatus !== 'Suspended' && 
    !s.isSuspended
  );

  const pool = [...allUsers];
  allSuppliers.forEach(s => {
    if (!pool.some(p => p.uid === s.supplierId || p.id === s.supplierId)) {
      pool.push({
        ...s,
        uid: s.supplierId,
        id: s.supplierId,
        role: 'supplier'
      });
    }
  });

  if (pool.length === 0) return [];

  const scored = [];
  for (const s of pool) {
    const sc = calculateLocationScore({
      customerAddress,
      customerCity,
      supplierAddress: s.address || '',
      supplierCity: s.city || '',
      deliveryAreas: s.deliveryAreas || []
    });
    if (sc > 0) {
      scored.push({ supplier: s, score: sc });
    }
  }

  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score);
    // Only return suppliers with a meaningful location match (score >= 10)
    const goodMatches = scored.filter(item => item.score >= 10);
    if (goodMatches.length > 0) return goodMatches.map(item => item.supplier);
  }

  // No meaningful location match found — return empty so UI shows "no plants near you"
  return [];
};

/**
 * Strictly filters orders for the logged-in supplier so out-of-range suppliers cannot see them.
 * Supplier B will NEVER see Supplier A's orders.
 */
export const filterOrdersForSupplier = (
  orders = [],
  supplierId = '',
  supplierAddress = '',
  supplierCity = '',
  deliveryAreas = [],
  supplierEmail = '',
  supplierPhone = ''
) => {
  if (!supplierId && !supplierEmail) return [];

  const cleanEmail = (supplierEmail || '').trim().toLowerCase();
  const cleanId = String(supplierId || '').trim();

  // Find all known alias IDs for this supplier (e.g. auth UID vs suppliers collection ID)
  const allSuppliers = getCollection('suppliers') || [];
  const matchedSupDoc = allSuppliers.find(s => 
    (cleanId && (s.supplierId === cleanId || s.uid === cleanId || s.userId === cleanId)) ||
    (cleanEmail && (s.email || '').toLowerCase() === cleanEmail)
  );

  const validSupplierIds = new Set([
    cleanId,
    `sup_${cleanId}`,
    cleanId.replace(/^sup_/, ''),
    matchedSupDoc?.supplierId,
    matchedSupDoc?.uid,
    matchedSupDoc?.userId
  ].filter(Boolean).map(id => String(id).trim()));

  const cleanPhoneDigits = (supplierPhone || '').replace(/\D/g, '');

  // Strict Supplier Isolation: Only show orders assigned directly to this specific supplier plant
  return orders.filter(order => {
    if (!order) return false;
    const orderSupId = String(order.supplierId || '').trim();

    // 1. Direct supplier ID match or alias match
    if (orderSupId && validSupplierIds.has(orderSupId)) {
      return true;
    }

    // 2. Email match if configured on order
    if (cleanEmail && (
      (order.supplierEmail || '').toLowerCase() === cleanEmail ||
      orderSupId.toLowerCase() === cleanEmail
    )) {
      return true;
    }

    // 3. Phone match if available
    if (cleanPhoneDigits && cleanPhoneDigits.length >= 10 && order.supplierPhone) {
      const orderPhoneDigits = String(order.supplierPhone).replace(/\D/g, '');
      if (orderPhoneDigits === cleanPhoneDigits) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Filters customers belonging to this supplier's delivery range or who have placed orders with this supplier.
 */
export const filterCustomersForSupplier = (
  customers = [],
  orders = [],
  supplierId = '',
  supplierAddress = '',
  supplierCity = '',
  deliveryAreas = []
) => {
  if (!supplierId) return [];

  const supplierOrders = filterOrdersForSupplier(orders, supplierId, supplierAddress, supplierCity, deliveryAreas);
  const customerIdsWithOrders = new Set(supplierOrders.map(o => o.customerId).filter(Boolean));
  const customerPhonesWithOrders = new Set(supplierOrders.map(o => o.customerPhone).filter(Boolean));
  const customerEmailsWithOrders = new Set(supplierOrders.map(o => o.customerEmail).filter(Boolean));

  return customers.filter(cust => {
    const cid = cust.customerId || cust.userId || cust.id;
    if (customerIdsWithOrders.has(cid) ||
        (cust.email && (customerIdsWithOrders.has(cust.email) || customerEmailsWithOrders.has(cust.email))) ||
        (cust.phone && customerPhonesWithOrders.has(cust.phone))) {
      return true;
    }

    return false;
  });
};
