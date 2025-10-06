import React from 'react';

interface SettingsCardProps {
    title: string;
    children: React.ReactNode;
    color?: 'default' | 'teal' | 'red';
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ title, children, color = 'default' }) => {
    
    const colorClasses = {
        default: 'bg-[#2C3E50] dark:bg-[#2C3E50]', // A dark blue-gray
        teal: 'bg-[#16A085] dark:bg-[#16A085]', // A muted teal
        red: 'bg-[#C0392B] dark:bg-[#C0392B]', // A soft red
    };

    return (
        <div className={`rounded-2xl shadow-lg text-white ${colorClasses[color]}`}>
            <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-bold">{title}</h3>
            </div>
            <div className="p-4 space-y-4 text-sm font-medium">
                {children}
            </div>
        </div>
    );
};
