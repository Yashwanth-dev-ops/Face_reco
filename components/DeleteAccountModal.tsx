

import React, { useState } from 'react';

interface DeleteAccountModalProps {
    onClose: () => void;
    onDelete: (password: string) => Promise<void>;
}

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose, onDelete }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!password) {
            setError("Password is required to delete your account.");
            return;
        }

        setLoading(true);
        try {
            await onDelete(password);
            // The onClose will be called by the parent component after successful deletion and logout.
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
                className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-red-500/50 w-full max-w-md m-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-400">Delete Account</h2>
                    <p className="text-gray-300 mt-2">
                        This action is irreversible. All your data will be permanently deleted.
                        Please enter your password to confirm.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="text-center text-sm h-5">
                        {error && <p className="text-red-400">{error}</p>}
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
                            disabled={loading}
                            className="btn-animated px-6 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>{loading ? 'Deleting...' : 'Delete My Account'}</span>
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};