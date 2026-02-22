import React,{ useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api"; // make sure this path is correct

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
    colors: "",     // comma separated
    sizes: "",      // comma separated
  });
  const [images, setImages] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImages(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("category", formData.category);
    data.append("offer", formData.offer || 0);
    data.append("stock", formData.stock || 0);
    data.append("weight", formData.weight);
    data.append("length", formData.length);
    data.append("breadth", formData.breadth);
    data.append("height", formData.height);
    data.append("hsn_code", formData.hsn_code);

    // Convert comma-separated strings to arrays
    if (formData.colors.trim()) {
      const colorArray = formData.colors.split(",").map(c => c.trim()).filter(Boolean);
      data.append("colors", JSON.stringify(colorArray));
    }
    if (formData.sizes.trim()) {
      const sizeArray = formData.sizes.split(",").map(s => s.trim()).filter(Boolean);
      data.append("sizes", JSON.stringify(sizeArray));
    }

    for (let i = 0; i < images.length; i++) {
      data.append("image", images[i]);
    }

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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block font-semibold">Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block font-semibold">Offer(%)</label>
          <input
            type="number"
            name="offer"
            value={formData.offer}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Stock</label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block font-semibold">Images (max 5)</label>
          <input
            type="file"
            multiple
            onChange={handleImageChange}
            accept="image/*"
            className="mt-1"
          />
        </div>

        <div>
          <label className="block font-medium">Colors (comma separated)</label>
          <input
            type="text"
            name="colors"
            value={formData.colors}
            onChange={handleChange}
            placeholder="Black, White, Red, Navy"
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Sizes (comma separated)</label>
          <input
            type="text"
            name="sizes"
            value={formData.sizes}
            onChange={handleChange}
            placeholder="S, M, L, XL, XXL"
            className="border p-2 w-full rounded"
          />
        </div>

        <button type="submit" className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800">
          Create Product
        </button>
      </form>
    </div>
  );
}
