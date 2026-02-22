import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import API from "../api"; // make sure this path is correct 

const Cart = () => {
  const { cart, removeFromCart, increaseQuantity, decreaseQuantity } = useCart();
  const navigate = useNavigate();

  const handleRemove = (id) => removeFromCart(id);
  const handleIncrease = (id) => increaseQuantity(id);
  const handleDecrease = (id) => decreaseQuantity(id);

  const handleBuyNow = (item) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to proceed");
      navigate("/login");
      return;
    }
    // Navigate to product page to handle buy now logic for single item
    navigate(`/product/${item.id}`);
  };

  if (cart.length === 0) {
    return (
      <div className="lg:container lg:mx-auto mt-10 m-3">
        <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="lg:container lg:mx-auto mt-10 m-3">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 mb-4 bg-white shadow rounded"
          >
            <Link to={`/product/${item.id}`} className="flex items-center">
              <img
                src={
                  item.image_urls?.length
                    ? `${API.defaults.baseURL}${item.image_urls[0]}`
                    : "/placeholder.png"
                }
                alt={item.name}
                className="w-16 h-16 mr-4 object-cover"
              />
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-gray-500">₹ {item.price}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDecrease(item.id)}
                className="bg-gray-300 px-2 py-1 rounded"
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => handleIncrease(item.id)}
                className="bg-gray-300 px-2 py-1 rounded"
              >
                +
              </button>
            </div>

            <p className="font-semibold">₹ {item.price * item.quantity}</p>

            <div className="flex gap-2">
              <button
                onClick={() => handleBuyNow(item)}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Buy Now
              </button>
              <button
                onClick={() => handleRemove(item.id)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {cart.map((item) => (
          <div
            key={item.id}
            className="border p-4 mb-4 flex flex-col bg-white rounded shadow"
          >
            <Link to={`/product/${item.id}`} className="flex items-center mb-2">
              <img
                src={
                  item.image_urls?.length
                    ? `${API.defaults.baseURL}${item.image_urls[0]}`
                    : "/placeholder.png"
                }
                alt={item.name}
                className="w-16 h-16 mr-4 object-cover"
              />
              {item.name}
            </Link>

            <div className="flex justify-between mb-2">
              <span>Price: ₹ {item.price}</span>
              <span>Total: ₹ {item.price * item.quantity}</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => handleDecrease(item.id)}
                className="bg-gray-300 px-2 py-1 rounded"
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => handleIncrease(item.id)}
                className="bg-gray-300 px-2 py-1 rounded"
              >
                +
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleBuyNow(item)}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Buy Now
              </button>
              <button
                onClick={() => handleRemove(item.id)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cart;
