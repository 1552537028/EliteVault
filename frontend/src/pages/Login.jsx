// Updated Login.jsx (added phone if needed, but since signup has it, login remains email/password)
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api"; // make sure this path is correct

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async () => {
    const { email, password } = form;

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { email, password });
      const data = res.data;

      if (data.token) {
        localStorage.setItem("token", data.token);
        navigate("/profile");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f0ef] px-6 py-12">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl font-inter">
        <h1 className="text-3xl font-playfair mb-8 text-center">Welcome Back</h1>

        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-medium text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "Signing in..." : "Log In"}
          </button>

          <div className="text-center mt-4">
            <span
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-gray-600 hover:text-black cursor-pointer hover:underline"
            >
              Forgot password?
            </span>
          </div>
        </div>

        <p className="mt-8 text-center text-gray-600 text-sm">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-black font-semibold cursor-pointer hover:underline"
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
