import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import product1 from "../assets/product1.jpeg";
import product2 from "../assets/product2.jpeg";
import product3 from "../assets/product3.jpeg";

const sections = [
    { title: "Welcome to Our Store", subtitle: "Discover Amazing Products", image: `url(${product1})` },
    { title: "Exclusive Deals", subtitle: "Shop Now and Save Big", image: `url(${product2})` },
    { title: "New Arrivals", subtitle: "Explore Our Latest Collections", image: `url(${product3})` },
];

const Hero = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % sections.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleButtonClick = () => {
        window.location.href = '/products';
    };

    return (
        <div className="relative w-full h-[60vh]">
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                style={{ backgroundImage: sections[currentIndex].image }}
            >
                <div className="absolute inset-0 bg-gradient from-primary/70 to-gray-900/70 flex items-center">
                    <div className="container mx-auto px-4 max-w-2xl space-y-6">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-light">
                            {sections[currentIndex].title}
                        </h1>
                        <h2 className="text-xl md:text-2xl lg:text-3xl text-gray-300">
                            {sections[currentIndex].subtitle}
                        </h2>
                        <button
                            className="border border-[#C6A75E] text-[#C6A75E] px-6 py-3 hover:bg-[#C6A75E] hover:text-white font-heading transition"
                            onClick={handleButtonClick}
                        >
                            EXPLORE COLLECTION
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Dots */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
                {sections.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                            currentIndex === index ? 'bg-light' : 'bg-gray-500'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default Hero;
