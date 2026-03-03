import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../api';

const STATUS_STEPS = ['ORDER_PLACED', 'ORDER_CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function normalizeStatus(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return 'PENDING';
  if (raw.includes('DELIVERED')) return 'DELIVERED';
  if (raw.includes('OUT') && raw.includes('DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (raw.includes('TRANSIT')) return 'IN_TRANSIT';
  if (raw.includes('PICKED')) return 'PICKED_UP';
  if (raw.includes('CONFIRM')) return 'ORDER_CONFIRMED';
  if (raw.includes('PAID') || raw.includes('PLACED') || raw.includes('CREATED')) return 'ORDER_PLACED';
  return raw.replace(/\s+/g, '_');
}

function formatStatus(status) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTrackingEvents(trackingData) {
  if (!trackingData) return [];

  const candidates = [
    trackingData.events,
    trackingData.data,
    trackingData.data?.events,
    trackingData.data?.tracking_data,
    trackingData.data?.tracking_data?.shipment_track_activities,
    trackingData.shipment_track_activities,
    trackingData.tracking_data,
    trackingData.tracking,
    trackingData.history,
  ];

  const arr = candidates.find((item) => Array.isArray(item));
  if (!arr) return [];

  return arr
    .map((event) => ({
      status: String(
        event.status || event.current_status || event.activity || event.message || event.description || 'Update'
      ),
      at: event.date || event.datetime || event.time || event.created_at || event.event_time || event.updated_at || null,
      location: String(event.location || event.city || event.hub || event.place || ''),
    }))
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
}

function resolveCurrentStatus(order, trackingData, events) {
  const fromTracking =
    trackingData?.current_status ||
    trackingData?.status ||
    trackingData?.data?.current_status ||
    trackingData?.data?.status ||
    events?.[0]?.status;

  return normalizeStatus(fromTracking || order?.tracking_status || order?.status || 'PENDING');
}

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const { data } = await API.get(`/orders/track/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setOrder(data?.order || null);
        setTracking(data?.tracking || null);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.error || 'Unable to load tracking details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, [id, navigate]);

  const events = useMemo(() => getTrackingEvents(tracking), [tracking]);
  const currentStatus = useMemo(() => resolveCurrentStatus(order, tracking, events), [order, tracking, events]);
  const currentStepIndex = useMemo(() => {
    const idx = STATUS_STEPS.indexOf(currentStatus);
    return idx >= 0 ? idx : 0;
  }, [currentStatus]);

  if (loading) {
    return <div className="text-center py-20">Loading tracking details...</div>;
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4">Order not found.</div>
      </div>
    );
  }

  const topImage = order.image_urls?.[0] ? `${API.defaults.baseURL}${order.image_urls[0]}` : null;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-heading mb-6">Track Order</h1>

      <div className="bg-white border p-4 md:p-5 mb-6 flex gap-4 items-center">
        {topImage ? (
          <img src={topImage} alt={order.product_name} className="w-24 h-24 object-cover " />
        ) : (
          <div className="w-24 h-24 bg-gray-100" />
        )}

        <div className="flex-1">
          <p className="font-semibold text-lg">{order.product_name}</p>
          <p className="text-sm text-gray-600">Order ID: {order.id}</p>
          <p className="text-sm text-gray-600">Qty: {order.quantity} </p>
          <p className="text-sm text-gray-600">AWB: {order.awb || 'Not generated yet'}</p>
        </div>
      </div>

      <div className="bg-white border p-4 md:p-6">
        <h2 className="text-xl font-heading mb-5">Order Progress</h2>

        <div className="space-y-5">
          {STATUS_STEPS.map((step, index) => {
            const done = index <= currentStepIndex;
            const isLast = index === STATUS_STEPS.length - 1;

            const matchedEvent = events.find((event) => normalizeStatus(event.status) === step);
            const fallbackAt = index === 0 ? order.created_at : null;
            const when = matchedEvent?.at || fallbackAt;

            return (
              <div key={step} className="relative pl-8">
                {!isLast && <div className={`absolute left-[11px] top-6 h-[calc(100%+12px)] w-[2px] ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}

                <div className={`absolute left-0 top-1 rounded-xl h-6 w-6 border-2 ${done ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`} />

                <div>
                  <p className={`font-body ${done ? 'text-gray-900' : 'text-gray-500'}`}>{formatStatus(step)}</p>
                  <p className="text-sm text-gray-500">{when ? formatDateTime(when) : 'Pending'}</p>
                  {matchedEvent?.location ? <p className="text-sm text-gray-600">{matchedEvent.location}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {events.length > 0 ? (
        <div className="bg-white border p-4 md:p-6 mt-6">
          <h2 className="text-xl font-heading mb-4">Tracking Updates</h2>
          <div className="space-y-4">
            {events.map((event, idx) => (
              <div key={`${event.status}-${event.at}-${idx}`} className="border p-3">
                <p className="font-body">{event.status}</p>
                <p className="text-sm text-gray-500">{formatDateTime(event.at)}</p>
                {event.location ? <p className="text-sm text-gray-600">{event.location}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 mt-6 text-sm">
          Tracking will add later
        </div>
      )}
    </div>
  );
}
