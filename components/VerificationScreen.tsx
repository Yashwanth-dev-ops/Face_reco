

import React, { useState, useEffect } from 'react';
import * as apiService from '../services/apiService';

interface VerificationScreenProps {
    userToVerify: {
        identifier: string;
        userType: 'STUDENT' | 'ADMIN';
    };
    onVerified: () => void;
    onBackToLogin: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-5 h-5 border-2 border-t-2 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
);

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const VerificationScreen: React.FC<VerificationScreenProps> = ({ userToVerify, onVerified, onBackToLogin }) => {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Fix: Replaced NodeJS.Timeout with a safer, browser-compatible useEffect hook for the cooldown timer.
    useEffect(() => {
        if (resendCooldown > 0) {
            const timerId = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [resendCooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (token.length !== 6) {
            setError("Please enter the 6-digit verification code.");
            return;
        }

        setLoading(true);
        try {
            await apiService.verifyUser(userToVerify.identifier, token, userToVerify.userType);
            setSuccess("Account verified successfully! Redirecting to login...");
            setTimeout(() => {
                onVerified();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setResendLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiService.resendVerificationToken(userToVerify.identifier, userToVerify.userType);
            setSuccess("A new verification code has been sent. Check the Mock Inbox.");
            setResendCooldown(60);
        } catch (err) {
             setError(err instanceof Error ? err.message : "Failed to resend code.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-slide-up">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Verify Your Account</h1>
                <p className="text-lg text-gray-400 mt-1">A verification code was sent to your email.</p>
                <p className="text-sm text-gray-500 mt-1">(Check the "Mock Inbox" at the bottom right)</p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-8 border border-gray-700 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-1">
                            Verification Code
                        </label>
                        <input
                            type="text"
                            id="token"
                            value={token}
                            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white transition text-center text-2xl tracking-[.5em]"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="text-center text-sm h-5">
                        {error && <p className="text-red-400">{error}</p>}
                        {success && <p className="text-green-400">{success}</p>}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !!success}
                            onMouseMove={handleMouseMove}
                            className="btn-animated w-full px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                        >
                            {loading ? <LoadingSpinner /> : (
                                 <span className="btn-content">
                                    <span className="btn-dot"></span>
                                    <span>Verify Account</span>
                                </span>
                            )}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-6 border-t border-gray-700 pt-4 space-y-2">
                    <button onClick={handleResend} disabled={resendLoading || resendCooldown > 0} className="text-sm text-blue-400 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed">
                        {resendLoading ? "Sending..." : (resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend")}
                    </button>
                    <button onClick={onBackToLogin} className="block w-full text-sm text-gray-400 hover:text-white hover:underline">
                        &larr; Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};