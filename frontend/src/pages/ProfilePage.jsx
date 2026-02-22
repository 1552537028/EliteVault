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
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <h1 className="text-3xl font-heading mb-8 text-center md:text-left">My Profile</h1>

          {/* Show Admin Panel only if user is admin */}
          {user?.email === ADMIN_EMAIL && (
            <button
              onClick={() => navigate("/list")}
              className="mb-8 block md:inline-block bg-[#1C1C1C] hover:bg-[#2C2C2C] text-white px-6 py-3 font-heading"
            >
              Admin Panel
            </button>
          )}
        </div>

        {/* ── Personal Info ───────────────────────────────────── */}
        <section className="mb-12 border-b pb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading">Personal Information</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-2 text-gray-700 hover:text-black"
              >
                <LuPencilLine /> Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  value={profileForm.name}
                  onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">New Password (optional)</label>
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                  placeholder="Leave blank to keep current"
                  className="w-full border rounded-lg px-4 py-2.5"
                />
              </div>

              {otpFor !== "profile" ? (
                <button
                  onClick={() => sendOtp("profile", profileForm.phone)}
                  disabled={otpTimer > 0}
                  className={`w-full py-3 rounded-lg text-white font-medium ${
                    otpTimer > 0 ? "bg-gray-400" : "bg-black hover:bg-gray-800"
                  }`}
                >
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Verify Phone & Save"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value.slice(0,6))}
                      className="flex-1 border px-4 py-2.5"
                    />
                    <button
                      onClick={() => verifyAndSave("profile")}
                      className="bg-[#1C1C1C] text-white px-6 py-2.5 hover:bg-gray-800"
                    >
                      Confirm
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setOtpFor(null);
                      setOtp("");
                      setOtpTimer(0);
                      clearInterval(timerRef.current);
                    }}
                    className="text-gray-600 hover:underline text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{user.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium break-all">{user.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{user.phone || "Not set"}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Addresses ───────────────────────────────────────── */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Addresses</h2>
            {editingAddressId === null && (
              <button
                onClick={() => startEditAddress()}
                className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800"
              >
                <LuPlus size={18} /> Add New
              </button>
            )}
          </div>

          {editingAddressId && (
            <div className="border rounded-xl p-6 mb-8 bg-gray-50">
              <h3 className="text-lg font-medium mb-4">
                {editingAddressId === "new" ? "Add New Address" : "Edit Address"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Address Line 1 *"
                  value={addressForm.address1}
                  onChange={e => setAddressForm({...addressForm, address1: e.target.value})}
                  className="border rounded-lg px-4 py-2.5"
                />
                <input
                  placeholder="Address Line 2"
                  value={addressForm.address2}
                  onChange={e => setAddressForm({...addressForm, address2: e.target.value})}
                  className="border rounded-lg px-4 py-2.5"
                />
                <input
                  placeholder="Landmark"
                  value={addressForm.landmark}
                  onChange={e => setAddressForm({...addressForm, landmark: e.target.value})}
                  className="border rounded-lg px-4 py-2.5"
                />
                <input
                  placeholder="City *"
                  value={addressForm.city}
                  onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                  className="border rounded-lg px-4 py-2.5"
                />
                <input
                  placeholder="State *"
                  value={addressForm.state}
                  onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                  className="border rounded-lg px-4 py-2.5"
                />
                <input
                  placeholder="Pincode *"
                  value={addressForm.pincode}
                  onChange={e => setAddressForm({...addressForm, pincode: e.target.value})}
                  className="border rounded-lg px-4 py-2.5"
                />
              </div>

              {otpFor !== "address" ? (
                <button
                  onClick={() => sendOtp("address", profileForm.phone || addressForm.phone)}
                  disabled={otpTimer > 0}
                  className={`mt-6 w-full py-3 rounded-lg text-white font-medium ${
                    otpTimer > 0 ? "bg-gray-400" : "bg-black hover:bg-gray-800"
                  }`}
                >
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Verify Phone & Save Address"}
                </button>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="flex gap-3">
                    <input
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value.slice(0,6))}
                      className="flex-1 border rounded-lg px-4 py-2.5"
                    />
                    <button
                      onClick={() => verifyAndSave("address")}
                      className="bg-green-600 text-white px-7 py-2.5 rounded-lg hover:bg-green-700"
                    >
                      Save
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setOtpFor(null);
                      setOtp("");
                      setOtpTimer(0);
                    }}
                    className="text-gray-600 hover:underline text-sm block"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-5">
            {addresses.length === 0 && editingAddressId === null && (
              <div className="text-center py-12 text-gray-500 border border-dashed rounded-xl">
                No addresses added yet
              </div>
            )}

            {addresses.map(addr => (
              <div
                key={addr.id}
                className="p-5 bg-gray-50 rounded-xl border relative group"
              >
                {editingAddressId !== addr.id ? (
                  <>
                    <p className="font-medium">{addr.address1}</p>
                    {addr.address2 && <p>{addr.address2}</p>}
                    {addr.landmark && <p className="text-sm text-gray-600">Landmark: {addr.landmark}</p>}
                    <p className="mt-1 text-sm">
                      {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => startEditAddress(addr)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="mt-12 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
