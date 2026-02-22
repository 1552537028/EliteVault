// Updated SignUp.jsx with phone number and OTP verification
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api"; // make sure this path is correct

export default function Signup() {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const timerRef = React.useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const startOtpTimer = () => {
    setOtpTimer(60);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    const { phone } = form;
    if (!phone.trim()) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await API.post("/auth/send-phone-otp", { phone });

      alert("OTP sent! (Check console for demo)");
      setOtpSent(true);
      startOtpTimer();
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const { name, email, phone, password } = form;

    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify OTP
      await API.post("/auth/verify-phone-otp", { phone, otp });

      // Signup
      await API.post("/auth/signup", { name, email, phone, password });

      alert("Account created successfully! Please log in.");
      navigate("/login");
    } catch (err) {
      setError("Something went wrong. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f0ef] px-6 py-12">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl font-inter">
        <h1 className="text-3xl font-playfair mb-8 text-center">Create Account</h1>

        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              disabled={loading || otpSent}
            />
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              disabled={loading || otpSent}
            />
          </div>

          <div>
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              disabled={loading || otpSent}
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
              disabled={loading || otpSent}
            />
          </div>

          {!otpSent ? (
            <button
              onClick={sendOtp}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium text-white transition ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"
              }`}
            >
              {loading ? "Sending OTP..." : "Send OTP to Phone"}
            </button>
          ) : (
            <>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  className="flex-1 border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  disabled={loading}
                />
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-medium text-white transition ${
                    loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loading ? "Verifying..." : "Verify & Sign Up"}
                </button>
              </div>
              <button
                onClick={sendOtp}
                disabled={otpTimer > 0 || loading}
                className={`mt-2 w-full py-2 text-sm text-gray-600 hover:text-black transition ${
                  otpTimer > 0 || loading ? "cursor-not-allowed" : ""
                }`}
              >
                {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : "Resend OTP"}
              </button>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-gray-600 text-sm">
          Already have an account?{" "}
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
