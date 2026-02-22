import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosSearch } from "react-icons/io";

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`); // Updated to navigate to the SearchResults page
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
        className="w-full p-3 pr-14 text-white border border-[#E5E0D8] rounded-md"
      />

      <button
        onClick={handleSearch}
        className="absolute right-0 top-0 h-full w-12 bg-[#C6A75E] rounded-r-md flex items-center justify-center"
      >
        <IoIosSearch className="h-6 w-6 text-white" />
      </button>
    </div>
  );
};

export default SearchBar;