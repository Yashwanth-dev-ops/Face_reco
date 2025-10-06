

import React, { useState } from 'react';
import { StudentInfo } from '../types';
import { CameraCapture } from './CameraCapture';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface OnboardingScreenProps {
    currentUser: StudentInfo;
    onComplete: (photoBase64: string, newPassword: string) => Promise<void>;
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

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ currentUser, onComplete }) => {
    const [step, setStep] = useState(1);
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNext = () => {
        setError('');
        if (!photoBase64) {
            setError('Please set a profile photo to continue.');
            return;
        }
        setStep(2);
    };

    const handleFinish = async () => {
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!photoBase64) { // Should not happen
            setError('Missing profile photo.');
            return;
        }
        setLoading(true);
        try {
            await onComplete(photoBase64, newPassword);
            // Parent component handles navigation
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setLoading(false);
        }
    };
    
    const StepIndicator: React.FC<{ current: number, total: number }> = ({ current, total }) => (
        <div className="flex justify-center items-center gap-2 mb-6">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={`w-8 h-2 rounded-full transition-colors ${i < current ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
            ))}
        </div>
    );
    
    const renderStepContent = () => {
        switch(step) {
            case 1: // Photo Capture
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white text-center">Step 1: Set Your Profile Photo</h2>
                        <p className="text-center text-sm text-gray-400 -mt-2 mb-2">This will be used for Face ID login and attendance.</p>
                        <CameraCapture
                            photo={photoBase64}
                            onPhotoCaptured={setPhotoBase64}
                            onRetake={() => setPhotoBase64(null)}
                        />
                        <button onMouseMove={handleMouseMove} onClick={handleNext} disabled={!photoBase64} className="btn-animated w-full px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 transition-colors shadow-lg disabled:opacity-50">
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>Continue</span>
                            </span>
                        </button>
                    </div>
                );
            case 2: // Set Password
                 return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white text-center">Step 2: Secure Your Account</h2>
                        <p className="text-center text-sm text-gray-400 -mt-2 mb-2">Create a new password to replace your temporary one.</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required autoFocus />
                            <PasswordStrengthMeter password={newPassword} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                        </div>
                        <div className="flex gap-4 pt-2">
                             <button type="button" onClick={() => setStep(1)} className="px-6 py-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">
                                &larr; Back
                            </button>
                            <button onMouseMove={handleMouseMove} onClick={handleFinish} disabled={loading} className="btn-animated w-full px-6 py-3 rounded-lg font-semibold text-white bg-green-600 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center">
                                <span className="btn-content">
                                    <span className="btn-dot"></span>
                                    <span>{loading ? <LoadingSpinner /> : 'Finish Setup'}</span>
                                </span>
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-slide-up">
            <div className="text-center mb-8">
                <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg" />
                <h1 className="text-3xl font-bold text-white">Account Setup</h1>
                <p className="text-lg text-gray-400 mt-1">Welcome, {currentUser.name}!</p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-8 border border-gray-700 backdrop-blur-sm">
                <StepIndicator current={step} total={2} />
                {renderStepContent()}
                {error && <p className="text-sm text-red-400 text-center mt-4">{error}</p>}
            </div>
        </div>
    );
};