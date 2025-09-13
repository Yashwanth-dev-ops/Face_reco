
import React from 'react';

interface CameraIconProps {
    className?: string;
}

export const CameraIcon: React.FC<CameraIconProps> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.55a2 2 0 01.45 2.12A12.01 12.01 0 0112 21a12.035 12.035 0 01-8-3.32 2 2 0 01.45-2.12L9 10m0 0h6m-6 0a3 3 0 01-3-3V6a3 3 0 013-3h6a3 3 0 013 3v1a3 3 0 01-3 3"
            />
        </svg>
    );
};
