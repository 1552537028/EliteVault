import React from "react";
import { useNavigate } from "react-router-dom";

const Collection = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#F8F6F2] border-b border-[#E5E0D8] py-4 mb-1 px-6 flex items-center justify-center">
      <nav className="hidden md:flex items-center space-x-10">
        
        <button
          onClick={() => navigate("/collections/t-shirts")}
          className="text-sm tracking-wide text-[#1C1C1C] hover:text-[#C6A75E] transition"
        >
          T-Shirts
        </button>

        <button
          onClick={() => navigate("/collections/jeans")}
          className="text-sm tracking-wide text-[#1C1C1C] hover:text-[#C6A75E] transition"
        >
          Jeans
        </button>

        <button
          onClick={() => navigate("/collections/hoodies")}
          className="text-sm tracking-wide text-[#1C1C1C] hover:text-[#C6A75E] transition"
        >
          Hoodies
        </button>

        <button
          onClick={() => navigate("/collections/men")}
          className="text-sm tracking-wide text-[#1C1C1C] hover:text-[#C6A75E] transition"
        >
          men
        </button>

      </nav>
    </div>
  );
};

export default Collection;
