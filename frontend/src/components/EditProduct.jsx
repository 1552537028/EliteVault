import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const BACKEND_URL = API.defaults.baseURL;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: 0,
    images: [], // new images to upload
  });

  const [existingImages, setExistingImages] = useState([]);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await API.get(`/products/product/${id}`);
        const product = res.data;

        setFormData({
          name: product.name || "",
          description: product.description || "",
          price: product.price || "",
          category: product.category || "",
          stock: product.stock || 0,
          images: [],
        });

        // Prepend BACKEND_URL to relative paths
        setExistingImages(
          (product.image_urls || []).map((img) => `${BACKEND_URL}${img}`)
        );
      } catch (err) {
        console.error(err);
      }
    };

    fetchProduct();
  }, [id]);

  // Handle text/number input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle new image selection
  const handleImageChange = (e) => {
    setFormData((prev) => ({ ...prev, images: Array.from(e.target.files) }));
  };

  // Remove existing image from UI (optional: send to backend for deletion)
  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit updated product
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("category", formData.category);
      data.append("stock", formData.stock);

      // Append new images
      formData.images.forEach((file) => {
        data.append("image", file);
      });

      await API.put(`/products/update/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/");
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-3xl font-bold mb-6 text-center">Edit Product</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            rows={4}
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Price ($)</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Stock</label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </div>

        {/* Existing Images */}
        <div>
          <label className="block font-semibold mb-1">Existing Images</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {existingImages.map((img, index) => (
              <div key={index} className="relative">
                <img
                  src={img}
                  alt="Product"
                  className="w-24 h-24 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            {existingImages.length === 0 && (
              <p className="text-gray-500 text-sm">No existing images</p>
            )}
          </div>
        </div>

        {/* New Images */}
        <div>
          <label className="block font-semibold mb-1">Add New Images</label>
          <input
            type="file"
            name="image"
            multiple
            onChange={handleImageChange}
            className="border p-2 w-full rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
        >
          Update Product
        </button>
      </form>
    </div>
  );
}
