// AllOrders.jsx (enhanced admin version – February 2026 style)
import React, { useEffect, useState, useMemo } from 'react';
import API from '../api';

export default function AllOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [datePreset, setDatePreset] = useState('all'); // all, today, yesterday, week, month, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const res = await API.get('/orders/all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load orders (admin only)');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // ────────────────────────────────────────────────
  //  Filtering Logic (runs on every filter change)
  // ────────────────────────────────────────────────
  useEffect(() => {
    let result = [...orders];

    // 1. Date filter
    if (datePreset !== 'all') {
      const now = new Date();
      let startDate;

      if (datePreset === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (datePreset === 'yesterday') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (datePreset === 'week' || datePreset === 'last7') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (datePreset === 'week' ? now.getDay() : 7));
        startDate.setHours(0, 0, 0, 0);
      } else if (datePreset === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (datePreset === 'last30') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
      } else if (datePreset === 'custom' && customStart && customEnd) {
        startDate = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        result = result.filter(o => {
          const created = new Date(o.created_at);
          return created >= startDate && created <= end;
        });
      }

      if (startDate) {
        result = result.filter(o => new Date(o.created_at) >= startDate);
      }
    }

    // 2. Status filter
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status?.toUpperCase() === statusFilter.toUpperCase());
    }

    // 3. Search (order ID, name, email, phone)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(o =>
        o.id.toLowerCase().includes(term) ||
        o.user_name?.toLowerCase().includes(term) ||
        o.email?.toLowerCase().includes(term) ||
        o.phone?.toLowerCase().includes(term) ||
        o.product_name?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(result);
  }, [orders, datePreset, customStart, customEnd, statusFilter, searchTerm]);

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return alert('No orders to export');

    const headers = [
      'Order ID', 'Date', 'Customer', 'Email', 'Phone', 'Product', 'Variant', 'Qty',
      'Amount', 'Status', 'AWB', 'Created At'
    ];

    const rows = filteredOrders.map(o => [
      o.id,
      new Date(o.created_at).toLocaleDateString('en-IN'),
      o.user_name,
      o.email,
      o.phone || '',
      o.product_name,
      `${o.color || ''} ${o.size || ''}`.trim() || '-',
      o.quantity,
      o.total_price,
      o.status,
      o.awb || '-',
      o.created_at
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-20">Loading orders...</div>;
  if (error) return <div className="text-center py-12 text-red-600 text-xl">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">All Orders</h1>
        <div className="text-sm text-gray-600">
          Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Preset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="last7">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="last30">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range – shown only when custom selected */}
          {datePreset === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
              {/* Add more statuses if your system has them */}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Order ID, name, email, phone..."
              className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Export CSV
          </button>
          {/* Future: bulk actions, print labels, etc. */}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variant</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AWB</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                  No orders match your filters
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {order.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{order.user_name}</div>
                    <div className="text-xs text-gray-500">{order.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{order.product_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {order.color || order.size ? (
                      <>
                        {order.color && <div>Color: {order.color}</div>}
                        {order.size && <div>Size: {order.size}</div>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{order.quantity}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    ₹{Number(order.total_price).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {order.awb ? (
                      <a
                        href={`https://www.ithinklogistics.com/track/?awb=${order.awb}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {order.awb}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order #{selectedOrder.id.slice(0, 8)}…
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Customer</h3>
                  <p>{selectedOrder.user_name}</p>
                  <p className="text-gray-600">{selectedOrder.email}</p>
                  <p className="text-gray-600">Phone: {selectedOrder.phone || '—'}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Order Info</h3>
                  <p>Status: <strong>{selectedOrder.status}</strong></p>
                  <p>Created: {new Date(selectedOrder.created_at).toLocaleString('en-IN')}</p>
                  {selectedOrder.awb && (
                    <p>
                      AWB:{' '}
                      <a
                        href={`https://www.ithinklogistics.com/track/?awb=${selectedOrder.awb}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedOrder.awb}
                      </a>
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-2">Product</h3>
                  <p className="font-medium">{selectedOrder.product_name}</p>
                  <p className="text-gray-600">
                    Variant: {selectedOrder.color || ''} {selectedOrder.size || ''} • Qty: {selectedOrder.quantity}
                  </p>
                  <p className="font-medium mt-1">
                    Total: ₹{Number(selectedOrder.total_price).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Future: add address, payment info, timeline, notes, cancel/refund buttons */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}