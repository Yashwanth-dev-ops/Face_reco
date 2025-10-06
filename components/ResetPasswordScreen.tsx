import React, { useState } from 'react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface ResetPasswordScreenProps {
    onResetPassword: (newPassword: string) => Promise<void>;
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

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onResetPassword, onBackToLogin }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await onResetPassword(newPassword);
            setSuccess("Password reset successfully! Redirecting to login...");
            setTimeout(() => {
                onBackToLogin();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-slide-up">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Reset Your Password</h1>
                <p className="text-lg text-gray-400 mt-1">Enter a new password for your account.</p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-8 border border-gray-700 backdrop-blur-sm">
                 <div className="bg-gray-900/50 p-3 rounded-lg mb-6 text-center">
                    <p className="text-sm text-yellow-300">In a real app, you would arrive here via a link in your email. For this simulation, we proceed directly.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="new-password"className="block text-sm font-medium text-gray-300 mb-1">
                            New Password
                        </label>
                        <input
                            type="password"
                            id="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white transition"
                            required
                        />
                         <PasswordStrengthMeter password={newPassword} />
                    </div>
                    <div>
                        <label htmlFor="confirm-password"className="block text-sm font-medium text-gray-300 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white transition"
                            required
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
                                    <span>Reset Password</span>
                                </span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};