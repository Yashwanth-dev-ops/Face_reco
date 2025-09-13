
import React, { useState } from 'react';
import { FaceResult, StudentInfo } from '../types';

interface RegistrationModalProps {
    face: FaceResult;
    onClose: () => void;
    onSave: (persistentId: number, info: StudentInfo) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ face, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && rollNumber.trim() && face.persistentId) {
            onSave(face.persistentId, { name, rollNumber });
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-md m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">Register Student</h2>
                    <p className="text-gray-400 mt-1">
                        Enter details for: <span className="font-semibold text-indigo-300">{face.personId}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                            Student Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            placeholder="e.g., John Doe"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-300 mb-1">
                            College Roll Number
                        </label>
                        <input
                            type="text"
                            id="rollNumber"
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            placeholder="e.g., 21A91A0501"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            disabled={!name.trim() || !rollNumber.trim()}
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};