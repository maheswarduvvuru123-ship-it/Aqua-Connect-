import { getCollection } from '../services/firestoreData';

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
    // 1: Nandyal District Region (Panyam, Balapanur, Banaganapalle, Allagadda, Betamcherla, NH40)
    new Set([
      'nandyal', 'panyam', 'paniem', 'balapanur', 'banaganapalle', 'allagadda',
      'betamcherla', 'nh40', 'nandikotkur', 'atmakur', 'srisailam', 'koilkuntla',
      '518112', '518501', '518502', '518503', '518504', '518511'
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
  const allUsers = getCollection('users') || [];
  const suppliers = allUsers.filter(u => {
    if (u.role !== 'supplier') return false;
    const n = (u.businessName || u.name || '').toLowerCase();
    const e = (u.email || '').toLowerCase();
    if (n.includes('paddu') || n.includes('jaya') || e.includes('paddu') || e.includes('jaya') || n.includes('@')) return false;
    return true;
  });
  if (suppliers.length === 0) return [];

  const scored = [];
  for (const s of suppliers) {
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
    return scored.map(item => item.supplier);
  }

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
  deliveryAreas = []
) => {
  if (!supplierId) return [];

  return orders.filter(order => {
    // Strictly filter out email testing account orders
    const cName = (order.customerName || '').toLowerCase();
    const pName = (order.plantName || order.supplierName || '').toLowerCase();
    const cId = (order.customerId || '').toLowerCase();
    if (cName.includes('@') || pName.includes('@') || cId.includes('@') || cName.includes('paddu') || cName.includes('jaya') || pName.includes('paddu') || pName.includes('jaya')) {
      return false;
    }

    // 1. Order explicitly created for this supplier
    if (order.supplierId === supplierId) return true;

    // 2. If order is stamped for another specific supplier, NEVER leak it to this supplier
    if (order.supplierId && order.supplierId !== 'supplier' && order.supplierId !== 'sup_001') {
      return false;
    }

    // 3. Unassigned legacy orders: only match if this supplier has an explicit high locality match (score >= 15)
    if (!order.supplierId || order.supplierId === 'supplier' || order.supplierId === 'sup_001') {
      if (supplierAddress || (deliveryAreas && deliveryAreas.length > 0)) {
        const sc = calculateLocationScore({
          customerAddress: order.deliveryAddress,
          customerCity: '',
          supplierAddress,
          supplierCity,
          deliveryAreas
        });
        return sc >= 15;
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

  return customers.filter(cust => {
    const cid = cust.customerId || cust.userId || cust.id;
    if (customerIdsWithOrders.has(cid) ||
        (cust.email && customerIdsWithOrders.has(cust.email)) ||
        (cust.phone && customerPhonesWithOrders.has(cust.phone))) {
      return true;
    }

    if ((supplierAddress || (deliveryAreas && deliveryAreas.length > 0)) && cust.address) {
      const sc = calculateLocationScore({
        customerAddress: cust.address,
        customerCity: '',
        supplierAddress,
        supplierCity,
        deliveryAreas
      });
      return sc >= 15;
    }

    return false;
  });
};
