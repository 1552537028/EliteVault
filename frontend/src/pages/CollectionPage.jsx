import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";
import API from "../api"; // make sure this path is correct
const CollectionPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const res = await API.get(`/products/category/${category}`);

      console.log("Fetched Products:", res.data);

      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

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

export default CollectionPage;
