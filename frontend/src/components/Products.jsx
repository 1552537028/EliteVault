import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";
const API_URL = API.defaults.baseURL + "/products";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchProducts = async () => {
    try {
      const res = await API.get(API_URL); 
      const data = res.data;             
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  fetchProducts();
}, []);

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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((item) => (
          <Link to={`/product/${item.id}`}
            key={item.id}
            className="border border-gray-200 hover:shadow-2xl transition-transform transform hover:-translate-y-2 flex flex-col items-center text-center"
          >
            <div className="w-full h-full overflow-hidden mb-4">
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

export default Products;
