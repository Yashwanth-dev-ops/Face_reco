


import React, { useState } from 'react';
import { StudentInfo, AdminInfo, Year } from '../types';

type BulkRegisterResult = {
    successful: StudentInfo[];
    failed: { studentData: any; reason: string }[];
};

interface BulkRegistrationPanelProps {
    onRegister: (studentsData: Omit<StudentInfo, 'isBlocked' | 'isVerified' | 'password' | 'marks'>[], adminId: string) => Promise<BulkRegisterResult>;
    currentUser: AdminInfo;
}

type ParsedStudent = Omit<StudentInfo, 'isBlocked' | 'isVerified' | 'password' | 'marks'>;

const InfoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);

const CheckCircleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const XCircleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const Step: React.FC<{ number: number; label: string; isActive: boolean }> = ({ number, label, isActive }) => (
    <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            {number}
        </div>
        <span className={`ml-2 text-sm font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
    </div>
);

const StepConnector: React.FC = () => <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700"></div>;

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const BulkRegistrationPanel: React.FC<BulkRegistrationPanelProps> = ({ onRegister, currentUser }) => {
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BulkRegisterResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileParse = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.trim().split(/\r?\n/);
                if (lines.length < 2) {
                    throw new Error("CSV file must have a header row and at least one data row.");
                }

                const headers = lines[0].split(',').map(h => h.trim());
                const requiredHeaders = ['name', 'rollNumber', 'department', 'year', 'section', 'email', 'phoneNumber'];
                const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));

                if (missingHeaders.length > 0) {
                    throw new Error(`CSV file is missing required headers: ${missingHeaders.join(', ')}.`);
                }

                const data: ParsedStudent[] = lines.slice(1).map((line, index) => {
                    const values = line.split(',');
                    const student = headers.reduce((obj, header, i) => {
                        obj[header] = values[i]?.trim();
                        return obj;
                    }, {} as any);
                    
                    // Basic validation
                    if (!student.name || !student.rollNumber || !student.email) {
                        throw new Error(`Row ${index + 2}: Missing required data (name, rollNumber, or email).`);
                    }
                    if (!Object.values(Year).includes(student.year as Year)){
                        throw new Error(`Row ${index + 2}: Invalid year value "${student.year}". Must be one of: ${Object.values(Year).join(', ')}.`);
                    }

                    return student as ParsedStudent;
                });

                setParsedData(data);
                setStep('preview');

            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to parse CSV file.");
                setStep('upload');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    };

    const handleRegistration = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await onRegister(parsedData, currentUser.idNumber);
            setResult(res);
            setStep('result');
        } catch (err) {
            setError("An unexpected error occurred during registration.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadTemplate = () => {
        const headers = 'name,rollNumber,department,year,section,email,phoneNumber';
        const exampleRow = 'John Doe,21A91A0501,CSE,1st Year,1,john.doe@example.com,9876543210';
        const csvContent = `${headers}\n${exampleRow}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'student_registration_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetState = () => {
        setStep('upload');
        setParsedData([]);
        setFileName('');
        setError(null);
        setResult(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Bulk Student Registration</h2>
            
            <div className="flex items-center w-full mb-6">
                <Step number={1} label="Upload" isActive={step === 'upload' || step === 'preview' || step === 'result'} />
                <StepConnector />
                <Step number={2} label="Preview" isActive={step === 'preview' || step === 'result'} />
                <StepConnector />
                <Step number={3} label="Result" isActive={step === 'result'} />
            </div>

            {step === 'upload' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700/60 text-blue-800 dark:text-blue-200 p-4 rounded-lg flex gap-4 items-start">
                        <InfoIcon />
                        <div>
                            <p className="font-bold">Instructions</p>
                            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                <li>Download the CSV template and fill in the student details.</li>
                                <li>The file must contain the headers: `name`, `rollNumber`, `department`, `year`, `section`, `email`, `phoneNumber`.</li>
                                <li>Newly registered students will be assigned a default password in the format: `Pass@&lt;last-4-digits-of-roll-number&gt;`.</li>
                                <li>Each new student will receive a verification email to complete their registration.</li>
                            </ul>
                        </div>
                    </div>
                    
                     <div className="flex flex-col sm:flex-row gap-4">
                        <button onMouseMove={handleMouseMove} onClick={handleDownloadTemplate} className="btn-animated w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-all shadow-md">
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>Download Template</span>
                            </span>
                        </button>
                        <label htmlFor="csv-upload" className="w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md cursor-pointer text-center">
                            Upload CSV File
                        </label>
                        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileParse} className="hidden" />
                    </div>

                    {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                </div>
            )}
            
            {step === 'preview' && (
                 <div className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Preview Data from <span className="font-mono text-blue-500 dark:text-blue-300">{fileName}</span> ({parsedData.length} records)</h3>
                    <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Roll Number</th>
                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Name</th>
                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Department</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                                {parsedData.map(student => (
                                    <tr key={student.rollNumber}>
                                        <td className="p-2 text-sm font-mono text-gray-600 dark:text-gray-300">{student.rollNumber}</td>
                                        <td className="p-2 text-sm text-gray-800 dark:text-white">{student.name}</td>
                                        <td className="p-2 text-sm text-gray-600 dark:text-gray-300">{student.department}</td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={resetState} className="px-4 py-2 rounded-lg font-semibold text-gray-800 dark:text-white bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all">Start Over</button>
                        <button onMouseMove={handleMouseMove} onClick={handleRegistration} disabled={isLoading} className="btn-animated px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md disabled:opacity-50">
                           <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>{isLoading ? 'Registering...' : `Register ${parsedData.length} Students`}</span>
                            </span>
                        </button>
                    </div>
                 </div>
            )}
            
             {step === 'result' && result && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Registration Complete</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700/60 text-green-800 dark:text-green-200 p-4 rounded-lg flex gap-3 items-center">
                            <CheckCircleIcon />
                            <div>
                                <p className="font-bold text-2xl">{result.successful.length}</p>
                                <p>Students Registered</p>
                            </div>
                        </div>
                         <div className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700/60 text-red-800 dark:text-red-200 p-4 rounded-lg flex gap-3 items-center">
                            <XCircleIcon />
                            <div>
                                <p className="font-bold text-2xl">{result.failed.length}</p>
                                <p>Registrations Failed</p>
                            </div>
                        </div>
                    </div>

                    {result.failed.length > 0 && (
                        <div>
                             <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Failure Details:</h4>
                             <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 space-y-2">
                                {result.failed.map((fail, index) => (
                                    <div key={index} className="text-sm">
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{fail.studentData.name} ({fail.studentData.rollNumber})</p>
                                        <p className="text-red-600 dark:text-red-400 ml-2">&rarr; {fail.reason}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                    <button onMouseMove={handleMouseMove} onClick={resetState} className="btn-animated px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md">
                        <span className="btn-content">
                            <span className="btn-dot"></span>
                            <span>Register More Students</span>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};