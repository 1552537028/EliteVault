import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../api';

export default function MyOrders() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const queryOrderId = new URLSearchParams(location.search).get('orderId');

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        if (queryOrderId) {
          try {
            await API.get(`/orders/verify-payment/${queryOrderId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (verifyErr) {
            console.error('Verify payment fallback failed:', verifyErr);
          }
        }

        const res = await API.get('/orders/user/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [location.search]);

  if (loading) return <div className="text-center py-20">Loading your orders...</div>;

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h2 className="text-xl font-bold mb-4">No orders yet</h2>
        <a href="/" className="text-blue-500 hover:underline">
          Start shopping →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-1">
      <h1 className="text-2xl font-heading mb-6">My Orders</h1>
      {orders.map((order) => (
        <div
          key={order.id}
          className="border p-3 flex items-center gap-1 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => navigate(`/track-order/${order.id}`)}
        >
          {order.image_urls?.[0] && (
            <img
              src={`${API.defaults.baseURL}${order.image_urls[0]}`}
              alt={order.product_name}
              className="w-20 h-20 object-cover"
            />
          )}
          <div>
            <p className="font-semibold">{order.product_name}</p>
            <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
          </div>
        </div>
      ))}
    </div>
  );
}