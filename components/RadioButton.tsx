import React from 'react';

interface RadioButtonProps {
    name: string;
    value: string;
    checked: boolean;
    onChange: (value: string) => void;
}

export const RadioButton: React.FC<RadioButtonProps> = ({ name, value, checked, onChange }) => {
    return (
        <label className="relative flex items-center justify-center w-6 h-6">
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={(e) => onChange(e.target.value)}
                className="absolute w-full h-full opacity-0 cursor-pointer"
            />
            <span
                className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                    checked ? 'border-blue-400' : 'border-gray-400'
                }`}
            ></span>
            {checked && (
                <span className="absolute w-3 h-3 bg-white rounded-full transition-transform duration-200 scale-100"></span>
            )}
        </label>
    );
};
