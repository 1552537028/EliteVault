import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import API from "../api"; // make sure this path is correct

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  // Review form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // UI states
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const imageRef = useRef(null);
  const frontendBaseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  useEffect(() => {
  const fetchData = async () => {
    try {
      // Product (must succeed)
      const { data: prodData } = await API.get(`/products/product/${id}`);
      setProduct(prodData);

      if (prodData.image_urls?.length) setSelectedImage(prodData.image_urls[0]);
      if (prodData.colors?.length) setSelectedColor(prodData.colors[0]);
      if (prodData.sizes?.length) setSelectedSize(prodData.sizes[0]);

      // Related products
      if (prodData.category) {
        const { data: relData } = await API.get(`/products/category/${prodData.category}`);
        setRelatedProducts(relData.filter(p => p.id !== id).slice(0, 4));
      }

      // Reviews (optional)
      try {
        const { data: revData } = await API.get(`/reviews/${id}`);
        setReviews(revData);
      } catch (err) {
        console.warn("Failed to fetch reviews:", err);
      }

      // User review check (optional, may fail with 403)
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const { data } = await API.get(`/reviews/user-has-reviewed/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setHasReviewed(data.hasReviewed);
        } catch (err) {
          console.warn("User review check failed:", err);
        }
      }

      setError(null); // reset error if product loaded
    } catch (err) {
      console.error(err);
      setError(err.message); // only set error if product itself fails
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [id]);

  // Price calculation – offer is DISCOUNT PERCENTAGE
  const salePrice = Number(product?.price || 0);

  let originalPrice = null;
  let discountPercentage = 0;

  if (product?.offer > 0 && product.offer <= 100) {
    discountPercentage = Math.round(product.offer);
    originalPrice = Math.round(salePrice / (1 - product.offer / 100));
  }

  // Zoom handlers
  const handleMouseMove = (e) => {
    if (!zoomActive || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  // Quantity controls
  const handleQuantityChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= (product?.stock || 1)) {
      setQuantity(val);
    }
  };

  const increment = () => {
    if (quantity < (product?.stock || 1)) setQuantity(q => q + 1);
  };

  const decrement = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  // Add to Cart
  const handleAddToCart = () => {
    if (!product) return;
    if (product.colors?.length > 0 && !selectedColor) return;
    if (product.sizes?.length > 0 && !selectedSize) return;
    if (quantity < 1 || quantity > (product.stock || 1)) return;

    addToCart({
      ...product,
      quantity,
      selectedColor,
      selectedSize,
    });
  };

  // Buy Now
  const handleBuyNow = async () => {
  if (!product) return;
  if (product.colors?.length > 0 && !selectedColor) return;
  if (product.sizes?.length > 0 && !selectedSize) return;
  if (product.stock < 1) return;

  const token = localStorage.getItem("token");
  if (!token) return navigate("/login");

  try {
    // Get user
    const { data: user } = await API.get("/auth/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Get addresses
    const { data: addresses } = await API.get(`/auth/address/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!addresses.length) return navigate("/profile");

    // Create payment session
    const { data: paymentData } = await API.post(
      "/orders/create-session",
      {
        productId: id,
        total_price: salePrice * quantity,
        userId: user.id,
        addressId: addresses[0].id,
        quantity,
        color: selectedColor || null,
        size: selectedSize || null,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, orderId } = paymentData;

    // Load Cashfree SDK
    await new Promise((res) => {
      if (window.Cashfree) return res();
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = res;
      document.body.appendChild(script);
    });

    const cashfree = window.Cashfree({ mode: "sandbox" });
    cashfree.checkout({
      paymentSessionId: sessionId,
      returnUrl: `${frontendBaseUrl}/payment-status?orderId=${orderId}`,
    });
  } catch (err) {
    console.error("Buy Now error:", err);
  }
};

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;
    if (!comment.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      return navigate("/login");
    }

    setSubmittingReview(true);

    try {
      const { data: newReview } = await API.post(
        "/reviews",
        { productId: id, rating, comment: comment.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReviews((prev) => [newReview, ...prev]);
      setHasReviewed(true);
      setRating(0);
      setComment("");
    } catch (err) {
      // Handle error
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-xl font-body">Loading...</div>;
  if (error || !product) return <div className="text-center py-20 text-red-600 font-body">Not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 bg-white min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Images + Zoom */}
        <div className="space-y-6">
          <div
            className="relative overflow-hidden shadow-xl border border-gray-200 bg-white cursor-zoom-in"
            onMouseEnter={() => setZoomActive(true)}
            onMouseLeave={() => setZoomActive(false)}
            onMouseMove={handleMouseMove}
            ref={imageRef}
          >
            <img
              src={`${API.defaults.baseURL}${selectedImage || product.image_urls?.[0] || ""}`}
              alt={product.name}
              className="w-full h-96 lg:h-[520px] object-contain transition-transform duration-150"
              style={{
                transform: zoomActive ? "scale(2.2)" : "scale(1)",
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              }}
            />
          </div>

          {product.image_urls?.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
              {product.image_urls.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`flex-shrink-0 overflow-hidden border-2 transition-all duration-200 ${
                    selectedImage === img
                      ? "border-[#C6A75E] scale-105 shadow-md"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img src={`${API.defaults.baseURL}${img}`} alt="" className="w-20 h-20 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-7">
          <div>
            <h1 className="text-3xl lg:text-4xl font-heading text-gray-900">{product.name}</h1>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-4xl lg:text-5xl font-heading text-gray-900">
              ₹{salePrice.toFixed(0)}
            </span>

            {originalPrice && (
              <>
                <span className="text-2xl text-gray-500 line-through font-body">
                  ₹{originalPrice}
                </span>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 text-sm font-body">
                  {discountPercentage}% OFF
                </span>
              </>
            )}
          </div>

          {product.stock <= 0 ? (
            <p className="text-red-600 font-body text-lg">Out of stock</p>
          ) : null}

          {/* Color */}
          {product.colors?.length > 0 && (
            <div className="space-y-3">
              <label className="block text-lg font-heading text-gray-900">Color</label>
              <div className="flex flex-wrap gap-4">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                    className={`group relative w-11 h-11 border-2 transition-all duration-200 shadow-sm ${
                      selectedColor === color
                        ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/30 scale-110"
                        : "border-gray-300 hover:border-gray-400 hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.toLowerCase() === "white" ? "#fefefe" : color.toLowerCase() }}
                  >
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-body text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {color}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {product.sizes?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-lg font-heading text-gray-900">Size</label>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-sm text-[#C6A75E] hover:underline font-body"
                >
                  Size Guide →
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-6 py-2.5 min-w-[60px] border font-body transition-all ${
                      selectedSize === size
                        ? "bg-[#1C1C1C] text-white border-[#1C1C1C] shadow-md"
                        : "border-gray-300 hover:border-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <label className="block text-lg font-heading text-gray-900">Quantity</label>
            <div className="flex items-center gap-5">
              <div className="flex border border-gray-300 overflow-hidden">
                <button
                  onClick={decrement}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold disabled:opacity-40 font-body"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock || 1}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-20 text-center border-none focus:ring-0 py-2.5 text-lg font-body [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={increment}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold disabled:opacity-40 font-body"
                  disabled={quantity >= (product.stock || 1)}
                >
                  +
                </button>
              </div>
              <span className="text-gray-600 font-body">
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              className="flex-1 bg-[#1C1C1C] text-white py-4 px-8 font-body text-lg hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              BUY NOW
            </button>
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="flex-1 border-2 border-[#C6A75E] text-[#C6A75E] py-4 px-8 font-body text-lg hover:bg-[#C6A75E] hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ADD TO CART
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pt-8 border-t border-gray-200">
              <h3 className="text-xl font-heading mb-4">Description</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line font-body">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-heading mb-8 text-center lg:text-left">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => {
              const relSalePrice = Number(rel.price || 0);
              let relOriginal = null;
              let relDiscount = 0;

              if (rel.offer > 0 && rel.offer <= 100) {
                relDiscount = Math.round(rel.offer);
                relOriginal = Math.round(relSalePrice / (1 - rel.offer / 100));
              }

              return (
                <Link
                  key={rel.id}
                  to={`/product/${rel.id}`}
                  className="group bg-white shadow-md overflow-hidden transition-transform hover:scale-105"
                >
                  <img
                    src={`${API.defaults.baseURL}${rel.image_urls?.[0] || ""}`}
                    alt={rel.name}
                    className="w-full h-fit object-cover"
                  />
                  <div className="p-4 flex flex-col justify-between">
                    <h3 className="font-heading text-lg text-gray-900 truncate">
                      {rel.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="font-body text-gray-900">₹{relSalePrice}</span>
                      {relOriginal && (
                        <>
                          <span className="text-sm text-gray-500 line-through font-body">
                            ₹{relOriginal}
                          </span>
                          <span className="text-xs text-gray-600 font-body">
                            {relDiscount}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews at bottom */}
      <div className="mt-16 border-t border-gray-200 pt-12">
        <h2 className="text-2xl font-heading mb-6 flex items-center gap-3">
          Customer Reviews
          {product.avg_rating > 0 && (
            <span className="text-xl font-heading text-yellow-500">
              {product.avg_rating.toFixed(1)} ★
            </span>
          )}
          <span className="text-gray-500 text-lg font-body">({reviews.length})</span>
        </h2>

        {reviews.length === 0 ? (
          <p className="text-gray-600 italic font-body">No reviews yet.</p>
        ) : (
          <div className="space-y-8">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-6 last:border-b-0">
                <div className="flex items-center gap-2 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-2xl ${i < review.rating ? "text-yellow-400" : "text-gray-200"}`}
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-sm text-gray-500 ml-3 font-body">
                    {new Date(review.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-gray-800 leading-relaxed font-body">{review.comment}</p>
                <p className="text-sm text-gray-600 mt-2 font-body">
                  — {review.user_name || "Anonymous"}
                </p>
              </div>
            ))}
          </div>
        )}

        {!hasReviewed && (
          <div className="mt-12 bg-white p-7 border border-gray-200 shadow-sm">
            <h3 className="text-xl font-heading mb-5">Write a Review</h3>
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div>
                <label className="block mb-3 font-heading text-gray-800">Your Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-4xl transition-transform hover:scale-110 ${
                        star <= rating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-3 font-heading text-gray-800">Your Review</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 p-4 focus:ring-2 focus:ring-[#C6A75E] focus:border-[#C6A75E] outline-none resize-none font-body"
                  placeholder="Share your thoughts..."
                  required
                  minLength={10}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="bg-[#1C1C1C] text-white px-8 py-3.5 font-body hover:bg-black transition disabled:opacity-60 shadow-sm"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSizeGuide(false)}
        >
          <div
            className="bg-white max-w-lg w-full p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSizeGuide(false)}
              className="absolute top-5 right-6 text-3xl text-gray-500 hover:text-gray-800"
            >
              ×
            </button>

            <h2 className="text-2xl font-heading mb-6 text-center">Size Guide</h2>

            <p className="text-gray-700 mb-6 text-center font-body">
              Measurements are approximate.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-4 font-heading">Size</th>
                    <th className="p-4 font-heading">Chest (inches)</th>
                    <th className="p-4 font-heading">Length (inches)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-4 font-body">S</td>
                    <td className="p-4 font-body">36–38</td>
                    <td className="p-4 font-body">27</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4 font-body">M</td>
                    <td className="p-4 font-body">38–40</td>
                    <td className="p-4 font-body">28</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4 font-body">L</td>
                    <td className="p-4 font-body">40–42</td>
                    <td className="p-4 font-body">29</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4 font-body">XL</td>
                    <td className="p-4 font-body">42–44</td>
                    <td className="p-4 font-body">30</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-sm text-gray-500 text-center font-body">
              * Measurements may vary slightly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
