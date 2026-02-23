import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function AddProduct() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    offer: "",
    stock: "",
    weight: "0.5",
    length: "20",
    breadth: "15",
    height: "10",
    hsn_code: "9983",
    colors: "",
    sizes: "",
  });

  const [images, setImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);

    const previews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(previews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value || "");
    });

    if (formData.colors.trim()) {
      const colorArray = formData.colors.split(",").map(c => c.trim()).filter(Boolean);
      data.set("colors", JSON.stringify(colorArray));
    }

    if (formData.sizes.trim()) {
      const sizeArray = formData.sizes.split(",").map(s => s.trim()).filter(Boolean);
      data.set("sizes", JSON.stringify(sizeArray));
    }

    images.forEach(file => data.append("image", file));

    try {
      await API.post("/products/add", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Product added successfully!");
      navigate("/list");
    } catch (err) {
      console.error(err);
      alert("Failed to add product");
    }
  };

  return (
    <div className="min-h-screen bg-[#eae8e6] py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white border border-black/10 shadow-2xl p-12">

        <h1 className="text-3xl uppercase tracking-wide mb-12">
          Add New Product
        </h1>

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* BASIC INFO */}
          <div className="grid md:grid-cols-2 gap-8">

            <div>
              <label className="block text-xs uppercase tracking-wide mb-2">Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide mb-2">Category</label>
              <input
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide mb-2">Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide mb-2">Offer (%)</label>
              <input
                type="number"
                name="offer"
                value={formData.offer}
                onChange={handleChange}
                className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide mb-2">Stock</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
            </div>

          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-xs uppercase tracking-wide mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
            />
          </div>

          {/* COLORS & SIZES */}
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs uppercase tracking-wide mb-2">
                Colors (comma separated)
              </label>
              <input
                name="colors"
                value={formData.colors}
                onChange={handleChange}
                placeholder="Black, White, Navy"
                className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide mb-2">
                Sizes (comma separated)
              </label>
              <input
                name="sizes"
                value={formData.sizes}
                onChange={handleChange}
                placeholder="S, M, L, XL"
                className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
            </div>
          </div>

          {/* IMAGE UPLOAD */}
          <div>
            <label className="block text-xs uppercase tracking-wide mb-4">
              Upload Images (Max 5)
            </label>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full border border-black px-4 py-3"
            />

            {/* Image Preview Grid */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                {previewUrls.map((url, index) => (
                  <div key={index} className="border border-black">
                    <img
                      src={url}
                      alt="preview"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="w-full border border-black py-4 uppercase tracking-wide hover:bg-black hover:text-white transition"
          >
            Create Product
          </button>

        </form>
      </div>
    </div>
  );
}
