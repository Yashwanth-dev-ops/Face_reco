import React, { useState } from 'react';

interface ForgotPasswordScreenProps {
    onRequestReset: (email: string) => Promise<void>;
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

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onRequestReset, onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await onRequestReset(email);
            setSuccess("If an account exists, reset instructions have been sent. Check the Mock Inbox for the reset token.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-slide-up">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
                <p className="text-lg text-gray-400 mt-1">Enter your email to reset your password.</p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-8 border border-gray-700 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white transition"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="text-center text-sm h-10">
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
                                    <span>Send Reset Instructions</span>
                                </span>
                            )}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-6 border-t border-gray-700 pt-4">
                    <button onClick={onBackToLogin} className="text-sm text-gray-400 hover:text-white hover:underline">
                        &larr; Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};