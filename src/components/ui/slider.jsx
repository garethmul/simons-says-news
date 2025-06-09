import React from 'react';

const Slider = ({ 
  value = [0], 
  onValueChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  className = "",
  disabled = false 
}) => {
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    if (onValueChange) {
      onValueChange([newValue]);
    }
  };

  const currentValue = Array.isArray(value) ? value[0] : value;

  return (
    <div className={`relative ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={`
          w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
          slider::-webkit-slider-thumb:appearance-none
          slider::-webkit-slider-thumb:h-4
          slider::-webkit-slider-thumb:w-4
          slider::-webkit-slider-thumb:rounded-full
          slider::-webkit-slider-thumb:bg-blue-600
          slider::-webkit-slider-thumb:cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((currentValue - min) / (max - min)) * 100}%, #e5e7eb ${((currentValue - min) / (max - min)) * 100}%, #e5e7eb 100%)`
        }}
      />
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export { Slider }; 