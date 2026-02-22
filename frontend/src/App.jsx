// App.jsx remains the same, no changes needed
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import ProductPage from "./pages/ProductPage";
import ProductsPage from "./pages/ProductsPage";
import ProfilePage from "./pages/ProfilePage";
import SearchResults from "./pages/SearchResults";

// 🔥 Import Auth Pages
import Signup from "./pages/SignUp";
import Login from "./pages/Login";
import AddAddress from "./pages/AddAddress";
import AddProduct from "./pages/AddProduct";
import PaymentStatus from "./components/PaymentStatus";
import ProductList from "./pages/ProductList"
import CollectionPage from "./pages/CollectionPage";
import EditProduct from "./components/EditProduct";
import ResetPassword from "./components/ResetPassword";
import ForgotPassword from "./components/ForgotPassword";
import { CartProvider } from "./context/CartContext";
import TrackOrder from "./components/TrackOrder";

import Cart from "./pages/CartPage";
import Myorders from "./pages/MyOrders";
import AllOrders from "./pages/AllOrders";
const App = () => {
  const location = useLocation();

  // Hide header/footer on auth pages for premium clean look
  const hideLayout =
    location.pathname === "/login" ||
    location.pathname === "/signup"||
    location.pathname === "/profile";

  return (
    <div className="min-h-screen bg-[#f2f0ef]">
      
      {!hideLayout && <Header />}
      <CartProvider>
          <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/collections/:category" element={<CollectionPage />} />
        <Route path="/add-address" element={<AddAddress />} />
        <Route path="/user-orders/:userId" element={<Myorders />} />
        <Route path="/add" element={<AddProduct />} />
        <Route path="/payment-status" element={<PaymentStatus />} />
        <Route path= "/list" element={<ProductList />}/>
        <Route path="/edit/:id" element={<EditProduct />} />
        <Route path="/cart" element={<Cart />}/>
        <Route path="/orders" element={<AllOrders/>}/>
        <Route path="/track-order/:id" element={<TrackOrder/>}/>
        {/* 🔐 Auth Routes */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/forgot-password" element={<ForgotPassword/>}/>
        <Route path="reset-password/:token" element={<ResetPassword/>}/>
      </Routes>
      </CartProvider>
      

      {!hideLayout && <Footer />}
    </div>
  );
};

export default App;
