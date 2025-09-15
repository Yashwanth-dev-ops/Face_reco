import React, { useState } from 'react';
import { StudentInfo, Year } from '../types';
import { CameraCapture } from './CameraCapture';

interface StudentRegistrationScreenProps {
    departments: string[];
    onRegister: (student: StudentInfo) => void;
    onBackToLogin: () => void;
}

export const StudentRegistrationScreen: React.FC<StudentRegistrationScreenProps> = ({ departments, onRegister, onBackToLogin }) => {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [department, setDepartment] = useState(departments[0] || '');
    const [year, setYear] = useState<Year>(Year.First);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [section, setSection] = useState('1');


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!photoBase64) {
            setError('Please capture a photo before registering.');
            return;
        }
        if (!department) {
             setError('No departments are configured. Please contact an administrator.');
             return;
        }

        setLoading(true);
        try {
            const newStudent: StudentInfo = {
                name,
                rollNumber: rollNumber.toUpperCase(),
                department,
                year,
                password,
                isBlocked: false,
                photoBase64: photoBase64,
                phoneNumber,
                section,
            };
            await onRegister(newStudent);
        } catch (err) {
             if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown registration error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-fade-in">
            <div className="text-center mb-8">
                 <h1 className="text-3xl font-bold text-white">Krishna University</h1>
                 <p className="text-gray-400 mt-1">Student Registration</p>
            </div>
            <div className="bg-slate-800/40 rounded-2xl shadow-2xl p-8 border border-slate-800 backdrop-blur-sm">
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField label="Full Name" type="text" value={name} onChange={setName} required />
                    <InputField label="Roll Number (Username)" type="text" value={rollNumber} onChange={setRollNumber} required />
                    <InputField label="Phone Number" type="tel" value={phoneNumber} onChange={setPhoneNumber} required />
                    <SelectField label="Department / Branch" value={department} onChange={setDepartment} options={departments} required />
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <SelectField label="Year" value={year} onChange={setYear} options={Object.values(Year)} required />
                        </div>
                        <div className="flex-1">
                            <SelectField label="Section" value={section} onChange={setSection} options={['1', '2', '3', '4']} required />
                        </div>
                    </div>
                    <InputField label="Password" type="password" value={password} onChange={setPassword} required />
                    
                    <CameraCapture
                        photo={photoBase64}
                        onPhotoCaptured={setPhotoBase64}
                        onRetake={() => setPhotoBase64(null)}
                    />
                    
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    
                    <div className="flex items-center justify-between gap-4 pt-4">
                        <button type="button" onClick={onBackToLogin} className="px-6 py-2 rounded-md text-gray-300 hover:underline">
                            &larr; Back to Login
                        </button>
                        <button type="submit" disabled={loading || !photoBase64} className="px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 active:translate-y-0.5 shadow-lg disabled:opacity-50">
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </div>
                 </form>
            </div>
        </div>
    );
};

// Helper sub-components for form fields
const InputField: React.FC<{label: string, type: string, value: string, onChange: (val: string) => void, required?: boolean}> = 
({ label, type, value, onChange, required }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition"
            required={required}
            autoCapitalize="words"
        />
    </div>
);

const SelectField: React.FC<{label: string, value: string, onChange: (val: any) => void, options: string[], required?: boolean}> =
({ label, value, onChange, options, required }) => (
     <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition"
            required={required}
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);