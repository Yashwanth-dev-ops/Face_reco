

import React, { useState } from 'react';
import { AdminInfo, StudentInfo } from '../types';
import * as apiService from '../services/apiService';

type LoginType = 'ADMIN' | 'STUDENT';
type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });

interface LoginScreenProps {
    onLogin: (user: CurrentUser) => void;
    onNavigateToRegister: (type: LoginType) => void;
    onForgotPassword: () => void;
    onBlockedLogin: (details: { blockedBy: string | null, expiresAt: number | null }) => void;
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

// --- Role Icons for Quick Access ---
const PrincipalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a1 1 0 000-2H4a1 1 0 000 2zm12 0h-3a1 1 0 100 2h3a1 1 0 100-2zM4 9a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm12 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zM4 14a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm12 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" /><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm8 3a1 1 0 00-1-1H9a1 1 0 000 2h2a1 1 0 001-1z" clipRule="evenodd" /></svg>;
const HODIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm2 6a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm3 1a1 1 0 100-2 1 1 0 000 2zm3-1a1 1 0 10-2 0 1 1 0 002 0z" clipRule="evenodd" /></svg>;
const TeacherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.61v5.063l-4.16-2.218a1 1 0 00-1.04 1.638l5.5 3a1 1 0 001.04 0l5.5-3a1 1 0 00-1.04-1.638L11 14.673V9.61l6.606-3.69a1 1 0 000-1.84l-7-3zM10 8.61l-6-3.333 6-2.667 6 2.667-6 3.333z" /></svg>;
const StudentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;

const QuickAccessPanel: React.FC<{ onQuickLogin: (role: 'principal' | 'hod' | 'teacher' | 'student') => void; loading: boolean }> = ({ onQuickLogin, loading }) => {
    const buttonClass = "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm text-white bg-gray-700/60 hover:bg-gray-600/80 disabled:opacity-50 disabled:cursor-wait transition-colors";
  return (
    <div className="mt-8 pt-6 border-t border-gray-700">
      <h3 className="text-center text-xs font-semibold text-gray-400 mb-3 tracking-wider uppercase">Quick Access (Demo)</h3>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onQuickLogin('principal')} disabled={loading} className={buttonClass}><PrincipalIcon /> Principal</button>
        <button onClick={() => onQuickLogin('hod')} disabled={loading} className={buttonClass}><HODIcon /> HOD (CSE)</button>
        <button onClick={() => onQuickLogin('teacher')} disabled={loading} className={buttonClass}><TeacherIcon /> Teacher (ECE)</button>
        <button onClick={() => onQuickLogin('student')} disabled={loading} className={buttonClass}><StudentIcon /> Student</button>
      </div>
    </div>
  );
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToRegister, onForgotPassword, onBlockedLogin }) => {
    const [loginType, setLoginType] = useState<LoginType>('ADMIN');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

     const handleQuickLogin = async (role: 'principal' | 'hod' | 'teacher' | 'student') => {
        setError('');
        setLoading(true);

        try {
            if (role === 'student') {
                const user = await apiService.loginStudent('DEMO-STUDENT', 'student');
                onLogin({ ...user, userType: 'STUDENT' });
            } else {
                let username = '';
                if (role === 'principal') username = 'principal';
                if (role === 'hod') username = 'hod-cse';
                if (role === 'teacher') username = 'teacher-ece';
                const user = await apiService.loginAdmin(username, 'admin');
                onLogin({ ...user, userType: 'ADMIN' });
            }
        } catch (err) {
             if (err instanceof apiService.BlockedLoginError) {
                onBlockedLogin(err.details);
            } else if (err instanceof Error) {
                setError(`Quick login failed: ${err.message}`);
            } else {
                setError('Quick login failed. Please ensure demo users exist.');
            }
        } finally {
            setLoading(false);
        }
    };


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
            if (err instanceof apiService.BlockedLoginError) {
                onBlockedLogin(err.details);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleTabChange = (type: LoginType) => {
        setLoginType(type);
        setError('');
        setUsername('');
        setPassword('');
    };

    return (
        <div className="w-full max-w-md mx-auto animate-slide-up">
            <div className="text-center mb-8">
                <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg" />
                <h1 className="text-3xl font-bold text-white">Krishna University</h1>
                <p className="text-lg font-semibold text-blue-400 mt-1">Face Attendance</p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-8 border border-gray-700 backdrop-blur-sm">
                <div className="flex bg-gray-900/50 p-1 rounded-lg mb-6">
                    <button onClick={() => handleTabChange('ADMIN')} className={`flex-1 py-2 font-semibold transition-colors rounded-md text-sm ${loginType === 'ADMIN' ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Admin</button>
                    <button onClick={() => handleTabChange('STUDENT')} className={`flex-1 py-2 font-semibold transition-colors rounded-md text-sm ${loginType === 'STUDENT' ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Student</button>
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
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white transition"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="password"className="block text-sm font-medium text-gray-300">
                                Password
                            </label>
                             <button type="button" onClick={onForgotPassword} className="text-xs font-medium text-blue-400 hover:underline">
                                Forgot Password?
                            </button>
                        </div>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white transition"
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-red-400 text-center h-5">{error}</p>}
                    
                    <div className="pt-2 space-y-3">
                        <button 
                            type="submit" 
                            disabled={loading}
                            onMouseMove={handleMouseMove}
                            className="btn-animated w-full px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                        >
                            {loading ? <LoadingSpinner /> : (
                                <span className="btn-content">
                                    <span className="btn-dot"></span>
                                    <span>{`Login as ${loginType}`}</span>
                                </span>
                            )}
                        </button>
                    </div>
                </form>
                <p className="text-center text-sm text-gray-400 mt-6">
                    Don't have an account?{' '}
                    <button onClick={() => onNavigateToRegister(loginType)} className="font-semibold text-blue-400 hover:underline">
                        Register as a {loginType}
                    </button>
                </p>

                <QuickAccessPanel onQuickLogin={handleQuickLogin} loading={loading} />
            </div>
        </div>
    );
};