


import React, { useState, useEffect, useMemo } from 'react';
import { AdminInfo, Designation, Year } from '../types';
import { CameraCapture } from './CameraCapture';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface AdminRegistrationScreenProps {
    departments: string[];
    onRegisterAdmin: (admin: Omit<AdminInfo, 'isVerified' | 'isBlocked'>) => Promise<void>;
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

export const AdminRegistrationScreen: React.FC<AdminRegistrationScreenProps> = ({ departments, onRegisterAdmin, onBackToLogin }) => {
    const [formData, setFormData] = useState({
        name: '',
        idNumber: '',
        email: '',
        phoneNumber: '',
        department: departments.filter(d => d !== 'Administration')[0] || '',
        designation: Designation.Teacher,
        year: Year.First,
        section: '1',
        password: '',
        confirmPassword: '',
    });
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const academicDepartments = useMemo(() => departments.filter(d => d !== 'Administration'), [departments]);
    const isLeadershipRole = formData.designation === Designation.Principal || formData.designation === Designation.VicePrincipal || formData.designation === Designation.Chairman;

    useEffect(() => {
        if (isLeadershipRole) {
            setFormData(prev => ({ ...prev, department: 'Administration' }));
        } else {
            if (formData.department === 'Administration') {
                setFormData(prev => ({ ...prev, department: academicDepartments[0] || '' }));
            }
        }
    }, [formData.designation, academicDepartments, isLeadershipRole]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setError('');
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!photoBase64) {
            setError("Please provide a profile photo for Face ID.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await onRegisterAdmin({
                name: formData.name,
                idNumber: formData.idNumber,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                department: formData.department.trim(),
                designation: formData.designation,
                section: formData.designation === Designation.Incharge ? formData.section : undefined,
                year: formData.designation === Designation.Incharge ? formData.year : undefined,
                password: formData.password,
                photoBase64: photoBase64,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown registration error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto animate-slide-up">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Admin & Staff Registration</h1>
                <p className="text-gray-400 mt-1">Create your administrative account.</p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl shadow-2xl p-8 border border-gray-700 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset>
                        <legend className="text-lg font-semibold text-white mb-4 text-center">Face ID Photo</legend>
                        <CameraCapture 
                            photo={photoBase64}
                            onPhotoCaptured={setPhotoBase64}
                            onRetake={() => setPhotoBase64(null)}
                        />
                    </fieldset>
                    
                    <fieldset>
                        <legend className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Personal & Contact Details</legend>
                        <div className="space-y-4">
                            <input type="text" placeholder="Full Name" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="email" placeholder="Email Address" value={formData.email} onChange={e => handleChange('email', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                                <input type="tel" placeholder="Phone Number" value={formData.phoneNumber} onChange={e => handleChange('phoneNumber', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                            </div>
                        </div>
                    </fieldset>

                     <fieldset>
                        <legend className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Official Details</legend>
                        <div className="space-y-4">
                             <input type="text" placeholder="Admin ID Number" value={formData.idNumber} onChange={e => handleChange('idNumber', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <select value={formData.designation} onChange={e => handleChange('designation', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required>
                                    {Object.values(Designation).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select value={formData.department} onChange={e => handleChange('department', e.target.value)} disabled={isLeadershipRole} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:bg-gray-700 disabled:cursor-not-allowed" required>
                                     {isLeadershipRole 
                                        ? <option value="Administration">Administration</option>
                                        : academicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            {formData.designation === Designation.Incharge && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                                     <select value={formData.year} onChange={e => handleChange('year', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" required>
                                        <option value="" disabled>Year of Responsibility</option>
                                        {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <select value={formData.section} onChange={e => handleChange('section', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" required>
                                        <option value="" disabled>Section of Responsibility</option>
                                        <option value="All Sections">All Sections</option>
                                        <option value="1">Section 1</option>
                                        <option value="2">Section 2</option>
                                        <option value="3">Section 3</option>
                                        <option value="4">Section 4</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </fieldset>
                    
                    <fieldset>
                        <legend className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Account Security</legend>
                        <div className="space-y-4">
                            <div>
                                <input type="password" placeholder="Create a password" value={formData.password} onChange={e => handleChange('password', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                                <PasswordStrengthMeter password={formData.password} />
                            </div>
                            <input type="password" placeholder="Confirm your password" value={formData.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                        </div>
                    </fieldset>

                    {error && <p className="text-sm text-red-400 text-center pt-2">{error}</p>}

                    <div className="pt-4">
                         <button onMouseMove={handleMouseMove} type="submit" disabled={loading} className="btn-animated w-full px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center">
                             <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>{loading ? <LoadingSpinner /> : 'Register'}</span>
                            </span>
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