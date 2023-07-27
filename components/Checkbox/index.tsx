import React, { useState } from 'react';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange }) => {

  return (
    <div className="flex items-center">
      <input 
        type="checkbox" 
        className={`form-checkbox h-5 w-5 text-blue-600 ${checked ? 'checked:bg-blue-600' : ''}`} 
        checked={checked} 
        onChange={onChange} 
      />
      <label className="ml-2">{label}</label>
    </div>
  );
};

export default Checkbox;
