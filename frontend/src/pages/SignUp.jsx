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
      const res = await API.post("/auth/send-phone-otp", { phone });

      // Open WhatsApp with prefilled OTP
      const message = encodeURIComponent(
        `Your OTP for account verification is: ${res.data.otp}`
      );

      window.open(
        `https://wa.me/91${phone}?text=${message}`,
        "_blank"
      );

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
      await API.post("/auth/verify-phone-otp", { phone, otp });
      await API.post("/auth/signup", { name, email, phone, password });

      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      setError("Invalid OTP or something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

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
            disabled={loading || otpSent}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          <input
            type="email"
            name="email"
            placeholder="EMAIL ADDRESS"
            value={form.email}
            onChange={handleChange}
            disabled={loading || otpSent}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          <input
            type="tel"
            name="phone"
            placeholder="PHONE NUMBER"
            value={form.phone}
            onChange={handleChange}
            disabled={loading || otpSent}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          <input
            type="password"
            name="password"
            placeholder="PASSWORD"
            value={form.password}
            onChange={handleChange}
            disabled={loading || otpSent}
            className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
          />

          {!otpSent ? (
            <button
              onClick={sendOtp}
              disabled={loading}
              className="w-full border border-black py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
            >
              {loading ? "SENDING..." : "SEND OTP"}
            </button>
          ) : (
            <>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ENTER OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  disabled={loading}
                  className="flex-1 border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
                />

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="border border-black px-6 py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
                >
                  VERIFY
                </button>
              </div>

              <button
                onClick={sendOtp}
                disabled={otpTimer > 0 || loading}
                className="w-full text-sm tracking-wide mt-2 hover:underline"
              >
                {otpTimer > 0
                  ? `RESEND IN ${otpTimer}s`
                  : "RESEND OTP"}
              </button>
            </>
          )}
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
