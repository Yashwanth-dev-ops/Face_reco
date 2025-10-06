import React from 'react';

const COLORS = [ '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B' ];

const getInitials = (name: string): string => {
    if (!name) return '?';
    const nameParts = name.trim().split(' ');
    if (nameParts.length === 1 && nameParts[0].length > 0) {
        return nameParts[0].charAt(0).toUpperCase();
    }
    if (nameParts.length > 1) {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
    return '?';
};

const getColor = (name: string): string => {
    if (!name) return COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
};

interface AvatarProps {
    photoBase64?: string | null;
    name: string;
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ photoBase64, name, className = 'w-12 h-12' }) => {
    if (photoBase64) {
        return <img src={photoBase64} alt={name} className={`${className} rounded-full object-cover`} />;
    }

    const initials = getInitials(name);
    const color = getColor(name);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <rect width="100" height="100" fill="${color}" />
            <text x="50" y="55" font-family="Arial, sans-serif" font-size="45" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
        </svg>
    `;
    const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;

    return <img src={dataUrl} alt={name} className={`${className} rounded-full`} />;
};
