
import React, { useState } from 'react';
import { StudentInfo, AdminInfo, Designation } from '../types';

interface BlockStudentModalProps {
    student: StudentInfo;
    currentUser: AdminInfo;
    onClose: () => void;
    onBlock: (rollNumber: string, durationMs: number | 'PERMANENT') => void;
}

type BlockType = 'PERMANENT' | 'TEMPORARY';
type Duration = '45m' | '1h' | '2h' | '3h' | 'endOfDay';

const DURATION_OPTIONS: { value: Duration; label: string; ms: number }[] = [
    { value: '45m', label: '45 Minutes', ms: 45 * 60 * 1000 },
    { value: '1h', label: '1 Hour', ms: 60 * 60 * 1000 },
    { value: '2h', label: '2 Hours', ms: 2 * 60 * 60 * 1000 },
    { value: '3h', label: '3 Hours', ms: 3 * 60 * 60 * 1000 },
    { value: 'endOfDay', label: 'Rest of Day', ms: 0 }, // Calculated dynamically
];

const getEndOfDayMs = () => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return endOfDay.getTime() - now.getTime();
};

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const BlockStudentModal: React.FC<BlockStudentModalProps> = ({ student, currentUser, onClose, onBlock }) => {
    
    const canBlockPermanently = [Designation.Principal, Designation.VicePrincipal, Designation.HOD, Designation.Incharge].includes(currentUser.designation);

    const [blockType, setBlockType] = useState<BlockType>(canBlockPermanently ? 'TEMPORARY' : 'TEMPORARY');
    const [duration, setDuration] = useState<Duration>('45m');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (blockType === 'PERMANENT') {
            onBlock(student.rollNumber, 'PERMANENT');
        } else {
            let selectedDurationMs = DURATION_OPTIONS.find(d => d.value === duration)?.ms;
            if (duration === 'endOfDay') {
                selectedDurationMs = getEndOfDayMs();
            }
            if (selectedDurationMs !== undefined) {
                onBlock(student.rollNumber, selectedDurationMs);
            }
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
                    <h2 className="text-2xl font-bold text-white">Block Student</h2>
                    <p className="text-gray-400 mt-1">
                        Select blocking options for <span className="font-semibold text-indigo-300">{student.name}</span>.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    {canBlockPermanently && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Block Type</label>
                            <div className="flex bg-gray-900/50 p-1 rounded-lg">
                                <button type="button" onClick={() => setBlockType('TEMPORARY')} className={`flex-1 py-2 font-semibold transition-colors rounded-md text-sm ${blockType === 'TEMPORARY' ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Temporary</button>
                                <button type="button" onClick={() => setBlockType('PERMANENT')} className={`flex-1 py-2 font-semibold transition-colors rounded-md text-sm ${blockType === 'PERMANENT' ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Permanent</button>
                            </div>
                        </div>
                    )}
                    
                    {blockType === 'TEMPORARY' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {DURATION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setDuration(opt.value)}
                                        className={`p-3 text-center rounded-lg border-2 transition-colors ${duration === opt.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700/50 border-slate-600 text-gray-300 hover:border-slate-500'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                        >
                            Cancel
                        </button>
                        <button
                            onMouseMove={handleMouseMove}
                            type="submit"
                            className="btn-animated px-6 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>Confirm Block</span>
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};