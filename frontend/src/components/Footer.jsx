"use client"
import React from "react";
import { Link } from "react-router-dom";
const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-[#111111] to-[#1A1A1A] text-[#F8F6F2]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Brand */}
          <div>
            <h2 className="font-heading text-2xl mb-4">ELITE.VAULT</h2>
            <p className="font-body text-sm text-[#F8F6F2]/80 leading-relaxed">
              Building modern digital experiences with clean design and
              meaningful interactions.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 font-body text-sm text-[#F8F6F2]/80">
              <li><Link to="/" className="hover:text-white transition-colors cursor-pointer">Home</Link></li>
              <li><Link to="/AboutUs" className="hover:text-white transition-colors cursor-pointer">About</Link></li>
              <li><Link to="/ContactUs" className="hover:text-white transition-colors cursor-pointer">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-lg mb-4">Contact</h3>
            <p className="font-body text-sm text-[#F8F6F2]/80">
              elitevaultmen@gmail.com
            </p>
            <p className="font-body text-sm text-[#F8F6F2]/80 mt-2">
              +91 95426 01625
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#F8F6F2]/20 my-8"></div>

        {/* Bottom Section */}
        <div className="text-center font-body text-sm text-[#F8F6F2]/60">
          © {new Date().getFullYear()} ELITE.VAULT . All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;