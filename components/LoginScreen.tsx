import React, { useState } from 'react';
import { AdminInfo, StudentInfo } from '../types';
import * as apiService from '../services/apiService';
import { FaceLogin } from './FaceLogin';

type LoginType = 'ADMIN' | 'STUDENT';
type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });

interface LoginScreenProps {
    onLogin: (user: CurrentUser) => void;
    onNavigateToRegister: (type: LoginType) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-5 h-5 border-2 border-t-2 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
);

const FaceLoginModal: React.FC<{
    onLoginSuccess: (user: CurrentUser) => void;
    onCancel: () => void;
    onFailure: (errorMessage: string) => void;
}> = ({ onLoginSuccess, onCancel, onFailure }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <FaceLogin
                    onLoginSuccess={onLoginSuccess}
                    onCancel={onCancel}
                    onFailure={onFailure}
                />
            </div>
        </div>
    );
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToRegister }) => {
    const [loginType, setLoginType] = useState<LoginType>('ADMIN');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showFaceLogin, setShowFaceLogin] = useState(false);

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (loginType === 'ADMIN') {
                const user = await apiService.loginAdmin(username, password);
                onLogin({ ...user, userType: 'ADMIN' });
            } else { // loginType === 'STUDENT'
                const user = await apiService.loginStudent(username, password);
                onLogin({ ...user, userType: 'STUDENT' });
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleFaceLoginSuccess = (user: CurrentUser) => {
        setShowFaceLogin(false);
        if (user.userType === loginType) {
            onLogin(user);
        } else {
            const userTypeReadable = user.userType.toLowerCase();
            setError(`An ${userTypeReadable} account was found. Please use the '${user.userType}' tab for Face ID login.`);
        }
    };

    const handleFaceLoginFailure = (errorMessage: string) => {
        setShowFaceLogin(false);
        setError(errorMessage);
    };

    const handleFaceLoginCancel = () => {
        setShowFaceLogin(false);
        setError('');
    };

    const handleTabChange = (type: LoginType) => {
        setLoginType(type);
        setError('');
        setUsername('');
        setPassword('');
    };

    return (
        <div className="w-full max-w-sm mx-auto animate-fade-in">
             {showFaceLogin && (
                <FaceLoginModal
                    onLoginSuccess={handleFaceLoginSuccess}
                    onCancel={handleFaceLoginCancel}
                    onFailure={handleFaceLoginFailure}
                />
            )}
            <div className="text-center mb-8">
                <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg" />
                <h1 className="text-3xl font-bold text-white">Krishna University</h1>
                <p className="text-lg font-semibold text-indigo-300 mt-1">Face Attendance</p>
            </div>
            <div className="bg-slate-800/40 rounded-2xl shadow-2xl p-8 border border-slate-800 backdrop-blur-sm">
                <div className="flex border-b border-slate-700 mb-6">
                    <button onClick={() => handleTabChange('ADMIN')} className={`flex-1 py-2 font-semibold transition-colors ${loginType === 'ADMIN' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Admin</button>
                    <button onClick={() => handleTabChange('STUDENT')} className={`flex-1 py-2 font-semibold transition-colors ${loginType === 'STUDENT' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Student</button>
                </div>
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                            {loginType === 'ADMIN' ? 'Admin ID Number' : 'Student Roll Number'}
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setError(''); }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-300 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    
                    <div className="pt-2 space-y-3">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full px-6 py-3 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed active:translate-y-0.5 flex items-center justify-center shadow-lg"
                        >
                            {loading ? <LoadingSpinner /> : `Login as ${loginType}`}
                        </button>
                         <button
                            type="button"
                            onClick={() => { setError(''); setShowFaceLogin(true); }}
                            className="w-full px-6 py-3 rounded-md font-semibold text-white bg-slate-700 hover:bg-slate-600 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500 active:translate-y-0.5 flex items-center justify-center shadow-lg"
                        >
                            Login with Face ID
                        </button>
                    </div>
                </form>
                <p className="text-center text-sm text-gray-400 mt-6">
                    Don't have an account?{' '}
                    <button onClick={() => onNavigateToRegister(loginType)} className="font-semibold text-indigo-400 hover:underline">
                        Register as a {loginType}
                    </button>
                </p>
            </div>
        </div>
    );
};