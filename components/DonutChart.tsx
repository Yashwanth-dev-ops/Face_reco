import React from 'react';

interface DonutChartProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({ 
    percentage, 
    size = 120, 
    strokeWidth = 12, 
    color = 'text-indigo-400' 
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                <circle
                    className="text-slate-700"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={`${color} transition-all duration-500 ease-in-out`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <span className="absolute text-2xl font-bold text-white">{`${Math.round(percentage)}%`}</span>
        </div>
    );
};
