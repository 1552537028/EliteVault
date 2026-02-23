import React from 'react';
import SearchBar from './SearchBar';
import { useNavigate } from 'react-router-dom';
import { FaOpencart } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { IoBagCheckOutline } from "react-icons/io5";

const Header = () => {
  const navigate = useNavigate();

  const handleCartClick = () => navigate('/cart');
  const handleProfileClick = () => navigate('/profile');
  const handleUserOrdersClick = () => navigate('/user-orders/me');

  return (
    <div className='bg-[#1c1c1c] border-b border-[#E5E0D8] py-2 px-2 sm:px-4'>
      <div className="flex items-center justify-between flex-wrap sm:flex-nowrap">

        {/* Logo */}
        <h1
          className='text-lg sm:text-3xl text-[#E5E0D8] font-heading cursor-pointer mb-1 sm:mb-0'
          onClick={() => navigate('/')}
        >
          Elite.Vault
        </h1>

        {/* Search Bar */}
        <div className='flex-1 mx-2 mb-1 sm:mb-0 min-w-[120px] max-w-[500px]'>
          <SearchBar 
            className="w-full h-8 sm:h-12 rounded-none border border-[#E5E0D8] px-2"
          />
        </div>

        {/* Icons */}
        <div className='flex items-center gap-2 sm:gap-4'>
          <IoBagCheckOutline 
            className="text-[#E5E0D8] text-2xl sm:text-4xl cursor-pointer" 
            onClick={handleUserOrdersClick} 
          />
          <FaOpencart 
            className="text-[#E5E0D8] text-2xl sm:text-4xl cursor-pointer" 
            onClick={handleCartClick} 
          />
          <FaRegCircleUser 
            className="text-[#E5E0D8] text-2xl sm:text-4xl cursor-pointer" 
            onClick={handleProfileClick} 
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
