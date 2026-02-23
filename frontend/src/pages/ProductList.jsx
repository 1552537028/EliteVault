import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import API from "../api";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products"); // adjust endpoint
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/products/delete/${id}`);
      fetchProducts();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex justify-end items-end space-x-2">
          <button
          onClick={() => navigate("/add")}
          className="bg-[#1c1c1c] text-white px-4 py-2 hover:bg-[#C6A75E]"
        >
          Add Product
        </button>
        <button
          onClick={() => navigate("/orders")}
          className="bg-[#C6A75E] text-white px-4 py-2 hover:bg-[#1C1C1C]"
        >
          ORDERS
        </button></div>
        
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr className="text-center">
              <th className="p-2">ID</th>
              <th className="p-2">Image</th>
              <th className="p-2">Name</th>
              <th className="p-2">Price</th>
              <th className="p-2">Offer</th>
              <th className="p-2">Category</th>
              <th className="p-2">Stock</th>
              <th className="p-2">Edit</th>
              <th className="p-2">Delete</th>
            </tr>
          </thead>

          <tbody>
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id} className="text-center">
                  <td className="p-2 w-xs">{product.id}</td>
                  <td className="p-2">
                    <img
                      src={`${API.defaults.baseURL}${product.image_urls[0]}`}
                      alt={product.name}
                      className="w-12 h-12 object-cover mx-auto rounded"
                    />
                  </td>
                  <td className="p-2">{product.name}</td>
                  <td className="p-2">₹{product.price}</td>
                  <td className="p-2">{product.offer}%</td>
                  <td className="p-2">{product.category}</td>
                  <td className="p-2">{product.stock}</td>
                  <td className="p-2 cursor-pointer text-yellow-500 hover:text-yellow-600"
                      onClick={() => navigate(`/edit/${product.id}`)}>
                    <AiOutlineEdit size={20} />
                  </td>
                  <td className="p-2 cursor-pointer text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(product.id)}>
                    <AiOutlineDelete size={20} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="p-4 text-center">
                  No Products Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
