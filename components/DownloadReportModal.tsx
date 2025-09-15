import React, { useState } from 'react';
import { Year, AdminInfo, Designation } from '../types';

interface DownloadReportModalProps {
    onClose: () => void;
    onSubmit: (department: string, year: Year, section: string) => void;
    title: string;
    departments: string[];
    currentUser: AdminInfo;
}

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({ onClose, onSubmit, title, departments, currentUser }) => {
    
    const isDeptSelectionDisabled = [Designation.HOD, Designation.Incharge].includes(currentUser.designation);
    
    const [department, setDepartment] = useState(isDeptSelectionDisabled ? currentUser.department : 'ALL');
    const [year, setYear] = useState<Year>(Year.First);
    const [section, setSection] = useState('ALL');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(department, year, section);
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
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <p className="text-gray-400 mt-1">
                        Please select the year, section, and branch for the report.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                     <div>
                        <label htmlFor="department" className="block text-sm font-medium text-gray-300 mb-1">
                            Branch / Department
                        </label>
                        <select
                            id="department"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:cursor-not-allowed disabled:bg-slate-800"
                            required
                            disabled={isDeptSelectionDisabled}
                        >
                            {!isDeptSelectionDisabled && <option value="ALL">All Departments</option>}
                            {departments.filter(d => d !== 'Administration').map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-1">
                                Year
                            </label>
                            <select
                                id="year"
                                value={year}
                                onChange={(e) => setYear(e.target.value as Year)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                required
                            >
                                {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="section" className="block text-sm font-medium text-gray-300 mb-1">
                                Section
                            </label>
                             <select
                                id="section"
                                value={section}
                                onChange={(e) => setSection(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                required
                            >
                                <option value="ALL">All Sections</option>
                                <option value="1">Section 1</option>
                                <option value="2">Section 2</option>
                                <option value="3">Section 3</option>
                                <option value="4">Section 4</option>
                            </select>
                        </div>
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
                            className="px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Download Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};