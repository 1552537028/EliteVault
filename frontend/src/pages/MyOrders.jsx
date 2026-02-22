import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api'; // make sure this path is correct

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await API.get('/orders/user/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="text-center py-20">Loading your orders...</div>;

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">No orders yet</h2>
        <Link to="/" className="text-blue-600 hover:underline">Start shopping →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      <div className="space-y-6">
        {orders.map(order => (
          <div key={order.id} className="border rounded-lg p-5 bg-white shadow-sm hover:shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-500">Order ID: {order.id.slice(0,8)}...</p>
                <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {order.image_urls?.[0] && (
                <img 
                  src={`${API.defaults.baseURL}${order.image_urls[0]}`} 
                  alt={order.product_name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{order.product_name}</h3>
                <p className="text-sm text-gray-600">
                  Qty: {order.quantity} • ₹{order.total_price}
                  {order.color && ` • Color: ${order.color}`}
                  {order.size  && ` • Size: ${order.size}`}
                </p>
              </div>
            </div>

            <div className="mt-4 text-right">
              <Link 
                to={`/track-order/${order.order_id}`}
                className="text-[#C6A75E] hover:underline font-medium"
              >
                track order</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

