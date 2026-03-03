import React, { useState } from 'react';
import API from '../api';
import { CiMail } from "react-icons/ci";
import { BsFillTelephoneFill } from "react-icons/bs";
import { FaWhatsapp } from "react-icons/fa";
import { AiFillInstagram } from "react-icons/ai";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneNumber = "+919542601625";
  const whatsappMessage = encodeURIComponent("Hi, I would like to inquire about your services.");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await API.post('/contact', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 bg-[#F8F8F8] rounded-md shadow-sm">
      <h1 className="text-3xl font-heading text-center mb-8">Contact Us</h1>

      {submitted && (
        <p className="text-green-600 text-center mb-6 font-semibold">
          Thank you for reaching out! We'll get back to you soon.
        </p>
      )}

      {error && (
        <p className="text-red-600 text-center mb-6 font-semibold">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="Your Name"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows="5"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#C6A75E]"
            placeholder="Your message..."
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white font-semibold px-6 py-2 hover:bg-[#C6A75E] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
      <br/>
      <hr/>

      <div className="flex min-h-5 mt-10 bottom-10 items-center text-black justify-center">
        <div className="space-y-6 text-center">
          
          {/* Email */}
          <a
            href="mailto:elitevaultmen@gmail.com"
            className="flex items-center justify-center gap-3 text-lg hover:text-blue-600"
          >
            <CiMail className="text-2xl" />
            elitevaultmen@gmail.com
          </a>

          {/* Phone */}
          <a
            href="tel:+919542601625"
            className="flex items-center justify-center gap-3 text-lg hover:text-green-600"
          >
            <BsFillTelephoneFill className="text-2xl" />
            +91 {phoneNumber.slice(3)}
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${phoneNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 text-lg hover:text-green-500"
          >
            <FaWhatsapp className="text-2xl" />
            Chat on WhatsApp
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/elite_vault.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 text-lg hover:text-pink-500"
          >
            <AiFillInstagram className="text-2xl" />
            @elite_vault.in
          </a>

        </div>
      </div>
    </div>
  );
};

export default ContactUs;