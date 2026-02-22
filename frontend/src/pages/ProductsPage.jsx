import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import API from "../api"; // Axios instance

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get("q")?.toLowerCase() || "";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = searchQuery ? `/products?q=${searchQuery}` : "/products";
        const res = await API.get(url); // Axios handles baseURL + JSON parsing
        setProducts(res.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery]);

  if (loading)
    return (
      <p className="text-center text-gray-600 text-lg mt-20">
        Loading products...
      </p>
    );

  if (!products.length)
    return (
      <p className="text-center text-gray-600 text-lg mt-20">
        No products found.
      </p>
    );

  return (
    <div className="bg-none py-10 px-5 md:px-20">
      {searchQuery ? (
        <h1 className="text-2xl font-bold mb-6">
          Search Results for "{searchQuery}"
        </h1>
      ) : (
        <h1 className="text-2xl font-bold mb-6">All Products</h1>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((item) => (
          <Link
            to={`/product/${item.id}`}
            key={item.id}
            className="border border-gray-200 hover:shadow-2xl transition-transform transform hover:-translate-y-2 flex flex-col items-center text-center"
          >
            <div className="w-full h-64 overflow-hidden mb-4">
              <img
                src={`${API.defaults.baseURL}${item.image_urls[0]}`}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <h2 className="text-[#1C1C1C] font-heading text-lg mb-2">
              {item.name}
            </h2>
            <p className="text-gray-500 text-sm mb-4">{item.description}</p>
            <p className="text-[#1c1c1c] font-body text-lg">₹{item.price}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;