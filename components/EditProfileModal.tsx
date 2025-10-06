

import React, { useState } from 'react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface EditProfileModalProps {
    onClose: () => void;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose, onChangePassword }) => {
    const [currentPassword, setCurrentPassword] = useState('');
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
            setError("New passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await onChangePassword(currentPassword, newPassword);
            setSuccess("Password changed successfully!");
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-md m-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">Change Password</h2>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white"
                            required
                        />
                        <PasswordStrengthMeter password={newPassword} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white"
                            required
                        />
                    </div>

                    <div className="text-center text-sm h-5">
                        {error && <p className="text-red-400">{error}</p>}
                        {success && <p className="text-green-400">{success}</p>}
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onMouseMove={handleMouseMove}
                            type="submit"
                            disabled={loading || !!success}
                            className="btn-animated px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};