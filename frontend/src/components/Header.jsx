import React from 'react';
import SearchBar from './SearchBar';
import { useNavigate } from 'react-router-dom';
import { FaOpencart } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { IoBagCheckOutline } from "react-icons/io5";


const Header = () => {
  const navigate = useNavigate();

  const handleCartClick = () => {
    navigate('/cart');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };
  const handleUserOrdersClick = () => {
    navigate('/user-orders/me');
  };

  return (
    <div className='bg-[#1c1c1c] border-b border-[#E5E0D8] py-2 mb-1'>
      <div className="flex items-center justify-between">
        <h1 className='text-3xl text-[#E5E0D8] font-heading ml-1' onClick={() => navigate('/')}>
          Elite.Vault
        </h1>

        <SearchBar />

        <div className='flex items-center ml-2 gap-4 mr-2'>
          <IoBagCheckOutline className="text-[#E5E0D8] text-4xl cursor-pointer" onClick={handleUserOrdersClick} />
          <FaOpencart className="text-[#E5E0D8] text-4xl cursor-pointer" onClick={handleCartClick} />
          <FaRegCircleUser className="text-[#E5E0D8] text-4xl cursor-pointer" onClick={handleProfileClick} />
        </div>
      </div>
    </div>
  );
};

export default Header;
