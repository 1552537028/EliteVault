import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LuPencilLine, LuPlus } from "react-icons/lu";
import API from "../api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "", email: "", phone: "", password: "",
  });

  // OTP for profile
  const [otpFor, setOtpFor] = useState(null); // "profile" | "address" | null
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef(null);

  // Address editing state (id = "new" for adding)
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    address1: "", address2: "", landmark: "", city: "", state: "", pincode: "",
  });

  const [loading, setLoading] = useState(true);

  // Admin email
  const ADMIN_EMAIL = "jayanthkopparthi595@gmail.com" || "kadamshankar1512@gmail.com"; // <--- set your admin email here

  useEffect(() => {
    if (!token) return navigate("/login");
    loadProfile();
    return () => clearInterval(timerRef.current);
  }, [token]);

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

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data);
      setProfileForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        password: "",
      });
      await loadAddresses(data.id);
    } catch {
      localStorage.removeItem("token");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async (userId) => {
    try {
      const { data } = await API.get(`/auth/address/${userId}`);
      setAddresses(data || []);
    } catch {}
  };

  // ── OTP flow ───────────────────────────────────────
  const sendOtp = async (purpose, phoneValue) => {
    if (!phoneValue?.trim()) return alert("Phone number is required");

    try {
      await API.post("/auth/send-phone-otp", { phone: phoneValue.trim() });
      alert("OTP sent (check console for demo)");
      setOtpFor(purpose);
      setOtp("");
      startOtpTimer();
    } catch {
      alert("Failed to send OTP");
    }
  };

  const verifyAndSave = async (purpose) => {
    if (!otp.trim()) return alert("Enter OTP");

    try {
      await API.post("/auth/verify-phone-otp", {
        phone: purpose === "profile" ? profileForm.phone : addressForm.phone || profileForm.phone,
        otp,
      });

      // OTP verified → now save
      if (purpose === "profile") {
        await saveProfile();
      } else if (purpose === "address") {
        await saveAddress();
      }

      setOtpFor(null);
      setOtp("");
      setOtpTimer(0);
      clearInterval(timerRef.current);
    } catch {
      alert("Verification failed");
    }
  };

  const saveProfile = async () => {
    try {
      const body = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
      };
      if (profileForm.password) body.password = profileForm.password;

      await API.put("/auth/update-user", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert("Profile updated!");
      setEditingProfile(false);
      loadProfile();
    } catch {
      alert("Failed to update profile");
    }
  };

  const saveAddress = async () => {
    try {
      const body = { ...addressForm, userId: user.id };

      if (editingAddressId === "new") {
        await API.post("/auth/address", body);
      } else {
        await API.put(`/auth/address/${editingAddressId}`, body);
      }
      alert(editingAddressId === "new" ? "Address added!" : "Address updated!");
      setEditingAddressId(null);
      setAddressForm({
        address1: "", address2: "", landmark: "", city: "", state: "", pincode: "",
      });
      loadAddresses(user.id);
    } catch {
      alert("Failed to save address");
    }
  };

  const startEditAddress = (addr = null) => {
    if (addr) {
      setAddressForm({
        address1: addr.address1 || "",
        address2: addr.address2 || "",
        landmark: addr.landmark || "",
        city: addr.city || "",
        state: addr.state || "",
        pincode: addr.pincode || "",
      });
      setEditingAddressId(addr.id);
    } else {
      setAddressForm({
        address1: "", address2: "", landmark: "", city: "", state: "", pincode: "",
      });
      setEditingAddressId("new");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
  <div className="min-h-screen bg-[#eae8e6] py-12 px-6">
    <div className="max-w-4xl mx-auto bg-white border border-black/10 shadow-2xl p-10">

      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl tracking-wide font-semibold uppercase">
          My Profile
        </h1>

        {user?.email === ADMIN_EMAIL && (
          <button
            onClick={() => navigate("/list")}
            className="border border-black px-6 py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
          >
            Admin Panel
          </button>
        )}
      </div>

      {/* ───── Personal Info ───── */}
      <section className="mb-16 border-b border-black/20 pb-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl uppercase tracking-wide">
            Personal Information
          </h2>

          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="uppercase text-sm tracking-wide hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="space-y-6">

            <input
              value={profileForm.name}
              onChange={e => setProfileForm({...profileForm, name: e.target.value})}
              placeholder="FULL NAME"
              className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
            />

            <input
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm({...profileForm, email: e.target.value})}
              placeholder="EMAIL"
              className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
            />

            <input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
              placeholder="PHONE"
              className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
            />

            <input
              type="password"
              value={profileForm.password}
              onChange={e => setProfileForm({...profileForm, password: e.target.value})}
              placeholder="NEW PASSWORD (OPTIONAL)"
              className="w-full border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
            />

            {otpFor !== "profile" ? (
              <button
                onClick={() => sendOtp("profile", profileForm.phone)}
                disabled={otpTimer > 0}
                className="w-full border border-black py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
              >
                {otpTimer > 0 ? `RESEND IN ${otpTimer}s` : "VERIFY PHONE & SAVE"}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    placeholder="ENTER OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.slice(0,6))}
                    className="flex-1 border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
                  />
                  <button
                    onClick={() => verifyAndSave("profile")}
                    className="border border-black px-6 py-3 uppercase hover:bg-black hover:text-white transition"
                  >
                    Confirm
                  </button>
                </div>

                <button
                  onClick={() => {
                    setOtpFor(null);
                    setOtp("");
                    setOtpTimer(0);
                  }}
                  className="text-sm hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 text-gray-800">
            <div>
              <p className="text-xs tracking-wide text-gray-500 uppercase">Name</p>
              <p className="mt-1 font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-gray-500 uppercase">Email</p>
              <p className="mt-1 font-medium break-all">{user.email}</p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-gray-500 uppercase">Phone</p>
              <p className="mt-1 font-medium">{user.phone || "Not set"}</p>
            </div>
          </div>
        )}
      </section>

      {/* ───── Addresses ───── */}
      <section>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl uppercase tracking-wide">
            Addresses
          </h2>

          {editingAddressId === null && (
            <button
              onClick={() => startEditAddress()}
              className="border border-black px-6 py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
            >
              Add New
            </button>
          )}
        </div>

        {editingAddressId && (
          <div className="border border-black p-8 mb-10">

            <div className="grid md:grid-cols-2 gap-6">
              <input
                placeholder="ADDRESS LINE 1"
                value={addressForm.address1}
                onChange={e => setAddressForm({...addressForm, address1: e.target.value})}
                className="border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
              <input
                placeholder="ADDRESS LINE 2"
                value={addressForm.address2}
                onChange={e => setAddressForm({...addressForm, address2: e.target.value})}
                className="border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
              <input
                placeholder="CITY"
                value={addressForm.city}
                onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                className="border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
              <input
                placeholder="STATE"
                value={addressForm.state}
                onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                className="border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
              <input
                placeholder="PINCODE"
                value={addressForm.pincode}
                onChange={e => setAddressForm({...addressForm, pincode: e.target.value})}
                className="border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
              />
            </div>

            <div className="mt-8">
              {otpFor !== "address" ? (
                <button
                  onClick={() => sendOtp("address", profileForm.phone)}
                  disabled={otpTimer > 0}
                  className="w-full border border-black py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
                >
                  {otpTimer > 0 ? `RESEND IN ${otpTimer}s` : "VERIFY & SAVE ADDRESS"}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      placeholder="ENTER OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value.slice(0,6))}
                      className="flex-1 border border-black px-4 py-3 outline-none focus:bg-black focus:text-white transition"
                    />
                    <button
                      onClick={() => verifyAndSave("address")}
                      className="border border-black px-6 py-3 uppercase hover:bg-black hover:text-white transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {addresses.map(addr => (
            <div
              key={addr.id}
              className="border border-black/20 p-6"
            >
              <p className="font-medium">{addr.address1}</p>
              {addr.address2 && <p>{addr.address2}</p>}
              <p className="text-sm mt-1">
                {addr.city}, {addr.state} — {addr.pincode}
              </p>

              <button
                onClick={() => startEditAddress(addr)}
                className="mt-4 text-sm uppercase tracking-wide hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          navigate("/login");
        }}
        className="mt-16 w-full border border-black py-3 uppercase tracking-wide hover:bg-black hover:text-white transition"
      >
        Logout
      </button>

    </div>
  </div>
);
}
