import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function AddAddress() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const handleSendOtp = async () => {
    if (!phone) return alert("Enter phone number");

    await API.post("/auth/send-phone-otp", { phone });
    alert("OTP sent! Check console for demo");
    setOtpSent(true);
  };

  const handleVerifyAndSave = async () => {
    if (!otp) return alert("Enter OTP");

    await API.post("/auth/verify-phone-otp", { phone, otp });

    // Save address
    const { data: user } = await API.get("/auth/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    await API.post(
      "/auth/address",
      { userId: user.id, address1, city, state, pincode, phone },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    alert("Address saved successfully!");
    navigate("/profile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f0ef] px-6">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl font-inter">
        <h1 className="text-3xl font-playfair mb-6">Add Address</h1>

        <input
          type="text"
          placeholder="Address Line 1"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          className="w-full border px-4 py-3 rounded-lg mb-3"
        />
        <input
          type="text"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full border px-4 py-3 rounded-lg mb-3"
        />
        <input
          type="text"
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full border px-4 py-3 rounded-lg mb-3"
        />
        <input
          type="text"
          placeholder="Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          className="w-full border px-4 py-3 rounded-lg mb-3"
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border px-4 py-3 rounded-lg mb-3"
        />

        {!otpSent ? (
          <button
            onClick={handleSendOtp}
            className="w-full bg-black text-white py-3 rounded-lg mb-3"
          >
            Verify Phone
          </button>
        ) : (
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="flex-1 border px-4 py-3 rounded-lg"
            />
            <button
              onClick={handleVerifyAndSave}
              className="bg-black text-white px-6 rounded-lg"
            >
              Save Address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
