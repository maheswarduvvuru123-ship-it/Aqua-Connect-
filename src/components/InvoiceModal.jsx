import React from 'react';
import Modal from './Modal';
import { Printer, Droplets, CheckCircle2, Download } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const InvoiceModal = ({ isOpen, onClose, order, supplier }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order Receipt & Invoice #${order.orderId}`} maxWidth="680px">
      <div id="printable-invoice" style={{ padding: '10px' }}>
        {/* Invoice Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#0284c7',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Droplets size={20} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0369a1' }}>
                {supplier?.businessName || 'AquaPure Springs & Minerals'}
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
              {supplier?.address || 'Water Treatment & Bottling Facility'}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Phone: {supplier?.phone || '+91 98765 43210'} | GST: {supplier?.gstNumber || '36AAAAA0000A1Z5'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              INVOICE / CHALLAN
            </span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
              #{order.orderId}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              Date: {formatDateTime(order.createdAt)}
            </div>
          </div>
        </div>

        {/* Customer & Delivery details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '18px 0', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              DELIVERY TO
            </span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>
              {order.customerName}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#475569' }}>
              {order.customerPhone}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '4px' }}>
              {order.deliveryAddress}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              ORDER & PAYMENT INFO
            </span>
            <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '4px' }}>
              <strong>Status:</strong> {order.orderStatus}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#334155' }}>
              <strong>Payment Method:</strong> {order.paymentMethod}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#334155' }}>
              <strong>Payment Status:</strong> {order.paymentStatus}
            </div>
            {order.deliveryPerson && (
              <div style={{ fontSize: '0.825rem', color: '#334155' }}>
                <strong>Assigned Route:</strong> {order.deliveryPerson}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ textAlign: 'left', padding: '10px', fontSize: '0.8rem', color: '#475569' }}>#</th>
              <th style={{ textAlign: 'left', padding: '10px', fontSize: '0.8rem', color: '#475569' }}>Item Description</th>
              <th style={{ textAlign: 'center', padding: '10px', fontSize: '0.8rem', color: '#475569' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.8rem', color: '#475569' }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.8rem', color: '#475569' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontSize: '0.85rem' }}>{index + 1}</td>
                <td style={{ padding: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {item.name}
                  {item.unit && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>({item.unit})</span>}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.85rem' }}>{formatCurrency(item.price)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700 }}>
                  {formatCurrency(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Calculation summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <div style={{ width: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(order.totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Delivery Fee:</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>FREE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #0f172a', marginTop: '6px', fontSize: '1.05rem', fontWeight: 800 }}>
              <span>Total Payable:</span>
              <span style={{ color: '#0284c7' }}>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Returnable can note */}
        <div 
          style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            fontSize: '0.78rem',
            color: '#1e40af'
          }}
        >
          ℹ️ <strong>Water Can Return Policy:</strong> Please return empty water jars in good condition to the delivery driver to avoid replacement charges.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={18} /> Print Challan / Receipt
        </button>
      </div>
    </Modal>
  );
};

export default InvoiceModal;
