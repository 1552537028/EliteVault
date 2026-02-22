import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api";

const PaymentStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  const orderId = new URLSearchParams(location.search).get('orderId');

useEffect(() => {
  if (!orderId) {
    setStatus('error');
    return;
  }

  let isMounted = true;

  const pollStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatus('error');
        return;
      }

      const res = await API.get(`/orders/verify-payment/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;

      if (data.paid || data.status === 'PAID' || data.status === 'SUCCESS') {
        if (isMounted) {
          setStatus('success');
          setTimeout(() => navigate("/user-orders/me"), 2500);
        }
      } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        setStatus('failed');
      }
      // else keep polling (still pending)
    } catch (err) {
      console.error('Poll error:', err);
      if (err?.response?.status === 404) {
        if (isMounted) setStatus('not-found');
        return;
      }
      if (isMounted) setStatus('error');
    }
  };

  pollStatus();
  const interval = setInterval(pollStatus, 6000); // slightly longer interval

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, [orderId, navigate]);

  return (
    <div className="max-w-6xl mx-auto p-5 md:p-10 bg-[#f2f0ef] min-h-screen text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Payment Status</h1>
      {status === 'processing' && <p className="text-lg text-gray-600">Processing your payment... Please wait.</p>}
      {status === 'success' && <p className="text-lg text-green-600">Payment successful! Redirecting to order success...</p>}
      {status === 'failed' && <p className="text-lg text-red-600">Payment failed. Please try again.</p>}
      {status === 'error' && <p className="text-lg text-red-600">An error occurred. Please check your order status.</p>}
    </div>
  );
};

export default PaymentStatus;
