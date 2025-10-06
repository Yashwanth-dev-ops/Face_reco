

import React, { useState, useEffect } from 'react';
import { FaceResult, StudentInfo } from '../types';

interface RegistrationModalProps {
    face: FaceResult;
    unlinkedStudents: StudentInfo[];
    onClose: () => void;
    onLink: (persistentId: number, rollNumber: string) => void;
}

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ face, unlinkedStudents, onClose, onLink }) => {
    const [selectedRollNumber, setSelectedRollNumber] = useState(unlinkedStudents[0]?.rollNumber || '');
    const [error, setError] = useState('');

    useEffect(() => {
        // When the list of unlinked students changes, ensure the selection is valid.
        const isSelectedStudentValid = unlinkedStudents.some(s => s.rollNumber === selectedRollNumber);
        
        // If the selected student is no longer in the list, or no student is selected,
        // reset the selection to the first available student to prevent stale state.
        if (!isSelectedStudentValid) {
            setSelectedRollNumber(unlinkedStudents[0]?.rollNumber || '');
        }
    }, [unlinkedStudents]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRollNumber) {
            setError('Please select a student to link.');
            return;
        }
        if (face.persistentId) {
            onLink(face.persistentId, selectedRollNumber);
        }
    };
    
    if (!face.persistentId) return null;

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
                    <h2 className="text-2xl font-bold text-white">Link Student to Face</h2>
                    <p className="text-gray-400 mt-1">
                        Select a registered student to link with: <span className="font-semibold text-indigo-300">Person {face.persistentId}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                     <div>
                        <label htmlFor="student" className="block text-sm font-medium text-gray-300 mb-1">
                            Unlinked Students
                        </label>
                        <select
                            id="student"
                            value={selectedRollNumber}
                            onChange={(e) => setSelectedRollNumber(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white transition"
                            required
                        >
                            <option value="" disabled>-- Select a student --</option>
                            {unlinkedStudents.map(student => (
                                <option key={student.rollNumber} value={student.rollNumber}>
                                    {student.name} ({student.rollNumber})
                                </option>
                            ))}
                        </select>
                        {unlinkedStudents.length === 0 && <p className="text-xs text-yellow-400 mt-1">No unlinked students available for registration.</p>}
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <div className="flex items-center justify-end gap-4 pt-4">
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
                            className="btn-animated px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            disabled={!selectedRollNumber}
                        >
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>Link Student</span>
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};