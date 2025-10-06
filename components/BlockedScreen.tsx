import React, { useState, useEffect } from 'react';

interface BlockedScreenProps {
    blockedInfo: {
        adminName: string;
        expiresAt: number | null;
    };
    onBackToLogin: () => void;
}

const formatTimeLeft = (ms: number): string => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const BlockedScreen: React.FC<BlockedScreenProps> = ({ blockedInfo, onBackToLogin }) => {
    const { adminName, expiresAt } = blockedInfo;
    const isPermanent = expiresAt === Infinity;
    const [timeLeft, setTimeLeft] = useState('');
    
    useEffect(() => {
        if (!isPermanent && expiresAt) {
            const updateTimer = () => {
                const remaining = expiresAt - Date.now();
                if (remaining > 0) {
                    setTimeLeft(formatTimeLeft(remaining));
                } else {
                    setTimeLeft("Block Expired");
                    clearInterval(intervalId);
                }
            };
            
            updateTimer();
            const intervalId = setInterval(updateTimer, 1000);
            return () => clearInterval(intervalId);
        }
    }, [expiresAt, isPermanent]);


    return (
        <div className="w-full h-screen flex items-center justify-center animate-fade-in p-4">
            <div className="w-full max-w-lg mx-auto text-center">
                 <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-8 border border-red-500/50 backdrop-blur-sm">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <h1 className="text-4xl font-bold text-white mt-6">Account Blocked</h1>
                    <p className="text-lg text-gray-300 mt-4">
                        Your account access has been restricted by <span className="font-bold text-white">{adminName}</span>.
                    </p>
                    
                    <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
                        {isPermanent ? (
                            <p className="text-xl font-bold text-red-400">This block is permanent.</p>
                        ) : (
                             <div>
                                <p className="text-gray-300">Access will be restored in:</p>
                                <p className="text-4xl font-mono font-bold text-white mt-2">{timeLeft}</p>
                            </div>
                        )}
                        <p className="text-sm text-gray-400 mt-4">Please contact the administration if you believe this is an error.</p>
                    </div>

                    <button 
                        onClick={onBackToLogin}
                        onMouseMove={handleMouseMove}
                        className="btn-animated mt-8 w-full px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 transition-colors shadow-lg"
                    >
                        <span className="btn-content">
                            <span className="btn-dot"></span>
                            <span>&larr; Back to Login</span>
                        </span>
                    </button>
                 </div>
            </div>
        </div>
    );
};