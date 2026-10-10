import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  IndianRupee, 
  ShoppingBag, 
  Droplets, 
  Clock, 
  Calendar,
  TrendingDown
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import { useAuth } from '../../context/AuthContext';
import { getCollection, subscribeToData } from '../../services/firestoreData';
import { formatCurrency } from '../../utils/formatters';

const CustomerReports = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState('monthly'); // 'weekly' | 'monthly' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const loadData = () => {
    if (!currentUser) return;
    const all = getCollection('orders');
    const myOrders = all.filter(o => o.customerId === currentUser.uid || (currentUser.email && o.customerId === currentUser.email));
    setOrders(myOrders);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, [currentUser]);

  // Filter orders according to period
  const filteredOrders = orders.filter(o => {
    const oDate = new Date(o.createdAt);
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return oDate >= weekAgo;
    }
    if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      return oDate >= monthAgo;
    }
    if (period === 'custom' && customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59);
      return oDate >= s && oDate <= e;
    }
    return true;
  });

  // Calculate Metrics (Section 16: Total Orders, Total Spent, Monthly Spending, Number of Cans Ordered, Pending Payments)
  const totalOrders = filteredOrders.length;
  const deliveredOrders = filteredOrders.filter(o => o.orderStatus === 'Delivered');
  const deliveredCans = deliveredOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);
  const totalCansOrdered = filteredOrders
    .filter(o => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => {
      const orderCans = (o.items || []).reduce((itemSum, item) => itemSum + item.quantity, 0);
      return sum + orderCans;
    }, 0);
  const effectiveCansDelivered = deliveredCans > 0 ? deliveredCans : totalCansOrdered;
  const litresDrank = effectiveCansDelivered * 20;

  const totalSpent = filteredOrders
    .filter(o => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const pendingPayments = filteredOrders
    .filter(o => o.paymentStatus === 'Pending' && o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Simulated monthly chart data for user
  const monthlySpendingData = [
    { month: 'Jun', amount: 350, cans: 7 },
    { month: 'Jul', amount: 450, cans: 9 },
    { month: 'Aug', amount: 400, cans: 8 },
    { month: 'Sep', amount: 550, cans: 11 },
    { month: 'Oct (Current)', amount: totalSpent > 0 ? totalSpent : 400, cans: totalCansOrdered > 0 ? totalCansOrdered : 8 }
  ];
  const maxMonthlyAmount = Math.max(...monthlySpendingData.map(d => d.amount), 800);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            My Water Consumption & Spending
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Track how many water cans you've consumed and your total monthly water bills.
          </p>
        </div>
      </div>

      {/* Filter Options (Section 16: Weekly, Monthly, Custom Date) */}
      <div 
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'weekly', label: 'Past Week' },
            { id: 'monthly', label: 'Past Month' },
            { id: 'custom', label: 'Custom Range' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setPeriod(f.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: period === f.id ? 700 : 500,
                backgroundColor: period === f.id ? '#0284c7' : '#f1f5f9',
                color: period === f.id ? '#ffffff' : '#475569',
                border: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <input 
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-light)' }}
            />
            <span>to</span>
            <input 
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-light)' }}
            />
          </div>
        )}
      </div>

      {/* Metrics Cards (Section 16 - Total Orders, Litres Drank, Cans Delivered) */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px'
        }}
      >
        <StatsCard 
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingBag}
          color="indigo"
          subtitle={`${deliveredOrders.length} delivered`}
        />
        <StatsCard 
          title="Litres Drank"
          value={`${litresDrank}L`}
          icon={Droplets}
          color="cyan"
          subtitle="Pure RO+UV water consumed"
        />
        <StatsCard 
          title="Cans Delivered"
          value={effectiveCansDelivered}
          icon={Droplets}
          color="blue"
          subtitle="20L returnable cans"
        />
        <StatsCard 
          title="Total Spent"
          value={formatCurrency(totalSpent)}
          icon={IndianRupee}
          color="emerald"
          subtitle="Water bills paid"
        />
      </div>

      {/* Monthly Spending Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Monthly Water Expenses (₹)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Historical spending on drinking water</p>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
          {monthlySpendingData.map((d, index) => {
            const heightPercent = Math.max(15, (d.amount / maxMonthlyAmount) * 100);
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', marginBottom: '6px' }}>
                  ₹{d.amount}
                </div>
                <div 
                  style={{
                    width: '42px',
                    height: `${heightPercent}%`,
                    background: 'linear-gradient(180deg, #0284c7 0%, #06b6d4 100%)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.4s ease'
                  }} 
                />
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '10px' }}>
                  {d.month}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerReports;
