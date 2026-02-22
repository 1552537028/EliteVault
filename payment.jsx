import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api/products/product/";
const PAYMENT_API = "http://localhost:5000/api/orders/create-session";
const USER_API = "http://localhost:5000/api/auth/user";
const ADDRESSES_API = "http://localhost:5000/api/auth/address/";

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}${id}`);
        if (!res.ok) {
          console.error(`Error: ${res.status} ${res.statusText}`);
          setProduct(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setProduct(data);
        setSelectedImage(data.image_urls[0] || '');
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const loadCashfreeSDK = () => {
    return new Promise((resolve) => {
      if (window.Cashfree) {
        resolve();
      } else {
        const script = document.createElement("script");
        script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => console.error("Failed to load Cashfree SDK");
        document.body.appendChild(script);
      }
    });
  };

  const handleBuyNow = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to proceed');
        navigate('/login');
        return;
      }

      // Fetch current user
      const userResponse = await fetch(USER_API, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user');
      }
      const user = await userResponse.json();
      const userId = user.id;

      // Fetch user's addresses
      const addressesResponse = await fetch(`${ADDRESSES_API}${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!addressesResponse.ok) {
        throw new Error('Failed to fetch addresses');
      }
      const addresses = await addressesResponse.json();
      if (addresses.length === 0) {
        alert('Please add an address first');
        navigate('/profile');
        return;
      }
      const addressId = addresses[0].id;

      // Now proceed with payment
      const paymentResponse = await fetch(PAYMENT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: id,
          amount: product.price,
          userId,
          addressId,
        }),
      });
      if (!paymentResponse.ok) {
        throw new Error(`Payment initiation failed: ${paymentResponse.status}`);
      }
      const { sessionId, orderId } = await paymentResponse.json();

      // Load SDK if not loaded
      await loadCashfreeSDK();

      // Initialize Cashfree
      const cashfree = window.Cashfree({
        mode: "sandbox" // or "production"
      });

      const paymentOptions = {
        paymentSessionId: sessionId, // Changed to paymentSessionId
        returnUrl: `http://localhost:3000/payment-status?orderId=${orderId}`,
      };

      cashfree.checkout(paymentOptions).then((result) => {
        if (result.error) {
          console.error(result.error);
          alert('Payment failed');
        } else if (result.paymentDetails.paymentStatus === 'SUCCESS') {
          navigate(`/order-success/${orderId}`);
        }
      });
    } catch (err) {
      console.error(err);
      alert('Error initiating payment: ' + err.message);
    }
  };

  if (loading) return <p className="text-center text-gray-600 mt-20 text-lg">Loading product...</p>;

  if (!product) return <p className="text-center text-gray-600 mt-20 text-lg">Product not found</p>;

  return (
    <div className="max-w-6xl mx-auto p-5 md:p-10 bg-[#f2f0ef] min-h-screen">
      <div className="flex flex-col md:flex-row gap-10">
        {/* Image Gallery */}
        <div className="md:w-1/2 flex flex-col gap-4">
          <img src={`http://localhost:5000${selectedImage}`} alt={product.name} className="w-full h-96 object-cover" />
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden">
            {product.image_urls.map((img, idx) => (
              <img
                key={idx}
                src={`http://localhost:5000${img}`}
                alt={product.name}
                onClick={() => setSelectedImage(img)}
                className="w-24 h-24 object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
              />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="md:w-1/2 flex flex-col gap-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{product.name}</h1>
          <p className="text-gray-600 text-lg">{product.description}</p>
          <p className="text-2xl md:text-3xl text-blue-600 font-bold">₹{product.price}</p>
          <div className="flex gap-4 flex-col">
            <button
              onClick={handleBuyNow}
              className="border border-[#C6A75E] bg-[#1C1C1C] text-white min-w-44 px-6 py-3 hover:bg-[#C6A75E] hover:text-white font-heading transition"
            >
              BUY NOW
            </button>
            <button className="border border-[#C6A75E] text-[#C6A75E] px-6 py-3 hover:bg-[#C6A75E] hover:text-white font-heading transition">
              ADD TO CART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;