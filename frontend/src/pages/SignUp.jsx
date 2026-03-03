// Premium Square SignUp UI
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSignup = async () => {
    const { name, email, phone, password } = form;
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await API.post("/auth/signup", { name, email, phone, password });

      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eae8e6] px-6">
      <div className="w-full max-w-md bg-white border border-black/10 p-10 shadow-2xl">

        <h1 className="text-3xl tracking-wide font-semibold mb-10 text-center">
          CREATE ACCOUNT
        </h1>

        <div className="space-y-6">

          {error && (
            <div className="border border-black text-black px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            name="name"
            placeholder="FULL NAME"
            value={form.name}
            onChange={handleChange}
            disabled={loading}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          <input
            type="email"
            name="email"
            placeholder="EMAIL ADDRESS"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          <input
            type="tel"
            name="phone"
            placeholder="PHONE NUMBER"
            value={form.phone}
            onChange={handleChange}
            disabled={loading}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          <input
            type="password"
            name="password"
            placeholder="PASSWORD"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full border border-black py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
          >
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
        </div>

        <p className="mt-10 text-center text-sm tracking-wide">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="cursor-pointer underline"
          >
            LOG IN
          </span>
        </p>

      </div>
    </div>
  );
}
