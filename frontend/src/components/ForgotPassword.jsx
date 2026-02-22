// ForgotPassword.jsx - New component for /forgot-password
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await API.post("/auth/forgot-password", { email });
      setSuccess(true);
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
        <h1 className="text-3xl font-playfair mb-8 text-center">Reset Password</h1>

        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              If an account exists for {email}, a reset link has been sent. Please check your email.
            </div>
          )}

          <div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              disabled={loading || success}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || success}
            className={`w-full py-3 rounded-lg font-medium text-white transition ${
              loading || success
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </div>

        <p className="mt-8 text-center text-gray-600 text-sm">
          Remember your password?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-black font-semibold cursor-pointer hover:underline"
          >
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}
