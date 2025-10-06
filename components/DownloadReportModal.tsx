



import React, { useState } from 'react';
import { Year, AdminInfo, Designation } from '../types';

interface DownloadReportModalProps {
    onClose: () => void;
    // FIX: Update onSubmit to allow 'ALL' for the year parameter to match filter logic.
    onSubmit: (department: string, year: Year | 'ALL', section: string, time: string) => void;
    title: string;
    departments: string[];
    currentUser: AdminInfo;
}

const TIME_SLOTS = ['ALL', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00'];


const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({ onClose, onSubmit, title, departments, currentUser }) => {
    
    const isDeptSelectionDisabled = [Designation.HOD, Designation.Incharge].includes(currentUser.designation);
    
    const [department, setDepartment] = useState(isDeptSelectionDisabled ? currentUser.department : 'ALL');
    // FIX: Change year state to allow 'ALL' and set it as default.
    const [year, setYear] = useState<Year | 'ALL'>('ALL');
    const [section, setSection] = useState('ALL');
    const [time, setTime] = useState('ALL');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(department, year, section, time);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-lg m-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <p className="text-gray-400 mt-1">
                        Please select the criteria for the report.
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white transition disabled:cursor-not-allowed disabled:bg-slate-800"
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
                                // FIX: Update onChange to handle 'ALL' for year.
                                onChange={(e) => setYear(e.target.value as Year | 'ALL')}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white transition"
                                required
                            >
                                {/* FIX: Add 'All Years' option. */}
                                <option value="ALL">All Years</option>
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
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white transition"
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
                      <div>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-300 mb-1">
                            Time Slot / Period
                        </label>
                        <select
                            id="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white transition"
                            required
                        >
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Day' : t}</option>)}
                        </select>
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
                            onMouseMove={handleMouseMove}
                            type="submit"
                            className="btn-animated px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>Download Report</span>
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
