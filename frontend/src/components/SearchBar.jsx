import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosSearch } from "react-icons/io";

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="relative w-full max-w-3xl">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search products..."
        className="w-full h-8 sm:h-12 px-3 pr-12 text-white bg-[#1c1c1c] border border-[#E5E0D8] rounded-none focus:outline-none"
      />

      <button
        onClick={handleSearch}
        className="absolute right-0 top-0 h-8 sm:h-12 w-12 bg-[#C6A75E] flex items-center justify-center rounded-none"
      >
        <IoIosSearch className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </button>
    </div>
  );
};

export default SearchBar;
