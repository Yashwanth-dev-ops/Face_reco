import React, { useState, useEffect, useMemo } from 'react';
import { AdminInfo, Designation, Year } from '../types';
import { CameraCapture } from './CameraCapture';

interface AdminRegistrationScreenProps {
    departments: string[];
    onRegister: (admin: AdminInfo) => Promise<void>;
    onBackToLogin: () => void;
}

export const AdminRegistrationScreen: React.FC<AdminRegistrationScreenProps> = ({ departments, onRegister, onBackToLogin }) => {
    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [department, setDepartment] = useState('');
    const [designation, setDesignation] = useState<Designation>(Designation.Teacher);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDepartmentDisabled, setIsDepartmentDisabled] = useState(false);
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [section, setSection] = useState('1');
    const [year, setYear] = useState<Year>(Year.First);

    const academicDepartments = useMemo(() => departments.filter(d => d !== 'Administration'), [departments]);
    
    useEffect(() => {
        const isPrincipalOrVP = designation === Designation.Principal || designation === Designation.VicePrincipal;
        setIsDepartmentDisabled(isPrincipalOrVP);
        if (isPrincipalOrVP) {
            setDepartment('Administration');
        } else {
            // If the current department is 'Administration' or not in the academic list, reset it.
            if (department === 'Administration' || !academicDepartments.includes(department)) {
                setDepartment(academicDepartments[0] || ''); // Set to the first available academic dept, or empty string.
            }
        }
    }, [designation, academicDepartments, department]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!photoBase64) {
            setError('Please capture a profile photo before registering.');
            return;
        }
        setLoading(true);
        try {
            const newAdmin: AdminInfo = { 
                name, 
                idNumber, 
                phoneNumber, 
                department: department.trim(), 
                designation, 
                password,
                photoBase64,
                section: designation === Designation.Incharge ? section : undefined,
                year: designation === Designation.Incharge ? year : undefined,
            };
            await onRegister(newAdmin);
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

    const handleDesignationChange = (newDesignation: Designation) => {
        setDesignation(newDesignation);
        setSection('1');
        setYear(Year.First);
    };

    return (
        <div className="w-full max-w-md mx-auto animate-fade-in">
            <div className="text-center mb-8">
                 <h1 className="text-3xl font-bold text-white">Krishna University</h1>
                 <p className="text-gray-400 mt-1">Admin & Staff Registration</p>
            </div>
            <div className="bg-slate-800/40 rounded-2xl shadow-2xl p-8 border border-slate-800 backdrop-blur-sm">
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField label="Full Name" type="text" value={name} onChange={setName} required />
                    <InputField label="ID Number (Username)" type="text" value={idNumber} onChange={setIdNumber} required />
                    <InputField label="Phone Number" type="tel" value={phoneNumber} onChange={setPhoneNumber} required />
                    <SelectField label="Designation" value={designation} onChange={handleDesignationChange} options={Object.values(Designation)} required />
                    {designation === Designation.Incharge && (
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <SelectField label="Year Resp." value={year} onChange={setYear} options={Object.values(Year)} required />
                            </div>
                             <div className="flex-1">
                                <SelectField label="Section Resp." value={section} onChange={setSection} options={['1', '2', '3', '4', 'All Sections']} required />
                            </div>
                        </div>
                    )}
                    
                    {isDepartmentDisabled ? (
                         <InputField label="Department" type="text" value={department} onChange={() => {}} required disabled={true} />
                    ) : (
                        <SelectField 
                            label="Department" 
                            value={department} 
                            onChange={setDepartment} 
                            options={academicDepartments} 
                            required 
                        />
                    )}

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
const InputField: React.FC<{label: string, type: string, value: string, onChange: (val: string) => void, required?: boolean, list?: string, disabled?: boolean}> = 
({ label, type, value, onChange, required, list, disabled = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition disabled:bg-slate-800 disabled:cursor-not-allowed"
            required={required}
            list={list}
            disabled={disabled}
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
            {options.length === 0 && <option value="" disabled>No departments found</option>}
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);