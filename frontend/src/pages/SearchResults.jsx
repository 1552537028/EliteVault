import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API from "../api"; // make sure this path is correct

const SearchResults = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const query = new URLSearchParams(useLocation().search);
  const searchTerm = query.get("q") || "";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await API.get(
          `/products?q=${encodeURIComponent(searchTerm)}`
        );
        setProducts(response.data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm]);

  return (
    <div className="lg:container lg:mx-auto m-3">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-xl mb-4">Search Results for "{searchTerm}"</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : products.length > 0 ? (
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
      ) : (
        <p>No products found.</p>
      )}
    </div>
  );
};

export default SearchResults;
