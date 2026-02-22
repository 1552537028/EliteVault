// ResetPassword.jsx - New component for /reset-password/:token
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please enter and confirm your new password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await API.post(`/auth/reset-password/${token}`, { newPassword: password });
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
        <h1 className="text-3xl font-playfair mb-8 text-center">Set New Password</h1>

        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              Password reset successfully! You can now log in with your new password.
            </div>
          )}

          <div>
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              disabled={loading || success}
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </div>

        <p className="mt-8 text-center text-gray-600 text-sm">
          Back to{" "}
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
