

import React, { useState, useMemo, useEffect } from 'react';
import { TimeTableEntry, AdminInfo, Designation, Year } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { BulkTimetableModal } from './BulkTimetableModal';

interface TimetableManagementPanelProps {
    timeTable: TimeTableEntry[];
    onSave: (entries: TimeTableEntry[]) => Promise<void>;
    onUpdateEntry: (entry: TimeTableEntry) => Promise<void>;
    onFindSubstitute: (entry: TimeTableEntry) => void;
    admins: AdminInfo[];
    departments: string[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

const EntryModal: React.FC<{
    entry: Partial<TimeTableEntry> | null;
    onClose: () => void;
    onSave: (entry: TimeTableEntry) => void;
    teachers: AdminInfo[];
    departments: string[];
    existingEntries: TimeTableEntry[];
}> = ({ entry, onClose, onSave, teachers, departments, existingEntries }) => {
    const [formData, setFormData] = useState<Partial<TimeTableEntry>>({
        dayOfWeek: 1,
        startTime: '09:00',
        subject: '',
        teacherId: teachers[0]?.idNumber || '',
        department: departments[0] || '',
        year: Year.First,
        section: '1',
        ...entry
    });
    const [error, setError] = useState('');

    const academicDepartments = useMemo(() => departments.filter(d => d !== 'Administration'), [departments]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const endTime = `${String(parseInt(formData.startTime!.split(':')[0]) + 1).padStart(2, '0')}:00`;
        const newEntryId = `${formData.dayOfWeek}-${formData.startTime}-${formData.department}-${formData.year}-${formData.section}`;
        
        // Check for class conflicts: Is there already a class for this group at this time?
        const classConflict = existingEntries.find(e => 
            e.id !== formData.id && // Don't check against itself when editing
            e.dayOfWeek === formData.dayOfWeek &&
            e.startTime === formData.startTime &&
            e.department === formData.department &&
            e.year === formData.year &&
            e.section === formData.section
        );
        
        if (classConflict) {
            setError('A class for this department, year, and section already exists at this time.');
            return;
        }

        // Check for teacher conflicts: Is the selected teacher already busy at this time?
        const teacherConflict = existingEntries.find(e =>
            e.id !== formData.id && // Don't check against itself when editing
            e.teacherId === formData.teacherId &&
            e.dayOfWeek === formData.dayOfWeek &&
            e.startTime === formData.startTime
        );
    
        if (teacherConflict) {
            const teacher = teachers.find(t => t.idNumber === formData.teacherId);
            const teacherName = teacher ? teacher.name : `Teacher ID ${formData.teacherId}`;
            const conflictDetails = `${teacherConflict.department} / ${teacherConflict.year.replace(' Year','Y')} / Sec ${teacherConflict.section}`;
            setError(`${teacherName} is already scheduled for another class (${conflictDetails}) at this time.`);
            return;
        }

        const newEntry: TimeTableEntry = {
            id: formData.id || newEntryId,
            dayOfWeek: formData.dayOfWeek!,
            startTime: formData.startTime!,
            endTime: endTime,
            subject: formData.subject!,
            teacherId: formData.teacherId!,
            department: formData.department!,
            year: formData.year!,
            section: formData.section!,
        };
        onSave(newEntry);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">{entry?.id ? 'Edit Class' : 'Add New Class'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select value={formData.dayOfWeek} onChange={e => setFormData(f => ({...f, dayOfWeek: parseInt(e.target.value)}))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                            {DAYS_OF_WEEK.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}
                        </select>
                        <select value={formData.startTime} onChange={e => setFormData(f => ({...f, startTime: e.target.value}))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                            {TIME_SLOTS.slice(0, -1).map(slot => <option key={slot} value={slot}>{slot} - {`${String(parseInt(slot.split(':')[0]) + 1).padStart(2, '0')}:00`}</option>)}
                        </select>
                    </div>
                     <input type="text" placeholder="Subject Name (e.g., Data Structures)" value={formData.subject} onChange={e => setFormData(f => ({...f, subject: e.target.value}))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                     <select value={formData.teacherId} onChange={e => setFormData(f => ({...f, teacherId: e.target.value}))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                        {teachers.map(t => <option key={t.idNumber} value={t.idNumber}>{t.name} ({t.designation} - {t.department})</option>)}
                     </select>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <select value={formData.department} onChange={e => setFormData(f => ({...f, department: e.target.value}))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                            {academicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={formData.year} onChange={e => setFormData(f => ({...f, year: e.target.value as Year}))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                            {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={formData.section} onChange={e => setFormData(f => ({...f, section: e.target.value}))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                             {['1', '2', '3', '4'].map(s => <option key={s} value={s}>Section {s}</option>)}
                        </select>
                    </div>
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const TimetableManagementPanel: React.FC<TimetableManagementPanelProps> = ({ timeTable, onSave, onUpdateEntry, onFindSubstitute, admins, departments }) => {
    const [localTimeTable, setLocalTimeTable] = useState<TimeTableEntry[]>(timeTable);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Partial<TimeTableEntry> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setLocalTimeTable(timeTable);
    }, [timeTable]);

    const teachers = useMemo(() => admins.filter(a => [Designation.Teacher, Designation.Incharge, Designation.HOD, Designation.VicePrincipal, Designation.Principal].includes(a.designation)).sort((a,b) => a.name.localeCompare(b.name)), [admins]);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSuccessMessage('');
        await onSave(localTimeTable);
        setIsSaving(false);
        setSuccessMessage('Timetable saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleModalSave = (entry: TimeTableEntry) => {
        const updatedTable = [...localTimeTable];
        const existingIndex = updatedTable.findIndex(e => e.id === entry.id);
        if (existingIndex > -1) {
            updatedTable[existingIndex] = entry;
        } else {
            updatedTable.push(entry);
        }
        setLocalTimeTable(updatedTable);
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleDelete = (id: string) => {
        const newTable = localTimeTable.filter(e => e.id !== id);
        setLocalTimeTable(newTable);
    }
    
    const handleBulkSave = (newEntries: TimeTableEntry[]) => {
        setLocalTimeTable(prev => [...prev, ...newEntries]);
        setIsBulkModalOpen(false);
    };

    const hasChanges = JSON.stringify(localTimeTable) !== JSON.stringify(timeTable);

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
             {isModalOpen && <EntryModal entry={editingEntry} onClose={() => {setIsModalOpen(false); setEditingEntry(null);}} onSave={handleModalSave} teachers={teachers} departments={departments} existingEntries={localTimeTable} />}
             {isBulkModalOpen && <BulkTimetableModal onClose={() => setIsBulkModalOpen(false)} onSave={handleBulkSave} existingEntries={localTimeTable} teachers={teachers} departments={departments} />}

             <header className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Timetable</h2>
                <div className="flex items-center gap-2">
                     {successMessage && <span className="text-green-400 text-sm animate-fade-in">{successMessage}</span>}
                     <button onClick={() => setIsBulkModalOpen(true)} className="px-4 py-2 rounded-lg font-semibold text-gray-800 dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all shadow-md">Bulk Add Classes</button>
                     <button onClick={() => { setEditingEntry(null); setIsModalOpen(true); }} className="px-4 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md">Add New Class</button>
                    <button onClick={handleSaveChanges} disabled={!hasChanges || isSaving} className="px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-900/50">
                            <th className="p-2 border border-gray-200 dark:border-gray-700 w-28 text-sm text-gray-600 dark:text-gray-400">Time</th>
                            {DAYS_OF_WEEK.map(day => <th key={day} className="p-2 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.slice(0, -1).map(time => (
                            <tr key={time}>
                                <td className="p-2 border border-gray-200 dark:border-gray-700 text-center font-mono text-xs text-gray-500 dark:text-gray-400">
                                    {time} - {`${String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')}:00`}
                                </td>
                                {DAYS_OF_WEEK.map((day, dayIndex) => {
                                    const entriesInSlot = localTimeTable.filter(e => e.dayOfWeek === dayIndex + 1 && e.startTime === time);
                                    return (
                                        <td key={`${day}-${time}`} className="p-1 border border-gray-200 dark:border-gray-700 align-top min-w-[150px]">
                                            {entriesInSlot.length > 0 ? (
                                                <div className="space-y-1">
                                                {entriesInSlot.map(entry => {
                                                    const teacher = teachers.find(t => t.idNumber === entry.teacherId);
                                                    return (
                                                        <div key={entry.id} className={`bg-gray-50 dark:bg-gray-900/50 p-2 rounded-md shadow-sm relative group border-l-4 ${entry.isCancelled ? 'border-yellow-500' : entry.isAbsent ? 'border-red-500' : 'border-transparent'}`}>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className={`font-bold text-sm text-gray-900 dark:text-white truncate ${entry.isCancelled ? 'line-through' : ''}`}>{entry.subject}</p>
                                                                    <p className={`text-xs text-gray-600 dark:text-gray-400 truncate ${entry.isCancelled ? 'line-through' : ''}`}>{teacher ? teacher.name : 'Unknown Teacher'}</p>
                                                                    <p className={`text-xs text-blue-600 dark:text-blue-400 truncate ${entry.isCancelled ? 'line-through' : ''}`}>{entry.department} / {entry.year.replace(' Year','Y')} / Sec {entry.section}</p>
                                                                </div>
                                                                {!entry.isCancelled && (
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <label htmlFor={`absent-${entry.id}`} className="text-xs text-gray-500">Absent</label>
                                                                        <ToggleSwitch checked={!!entry.isAbsent} onChange={(checked) => onUpdateEntry({...entry, isAbsent: checked})} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {entry.isCancelled && <p className="text-xs font-semibold text-yellow-400 mt-1">{entry.cancellationReason}</p>}
                                                             {entry.isAbsent && !entry.isCancelled && (
                                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                                                                     <button onClick={() => onFindSubstitute(entry)} className="w-full text-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded py-1 transition-colors">Find Substitute</button>
                                                                </div>
                                                            )}
                                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                <button onClick={() => { setEditingEntry(entry); setIsModalOpen(true); }} className="p-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                                                </button>
                                                                <button onClick={() => handleDelete(entry.id)} className="p-1 rounded bg-gray-200 dark:bg-gray-600 text-red-500 hover:bg-gray-300 dark:hover:bg-gray-500">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                </div>
                                            ) : (
                                                <div className="h-24 flex items-center justify-center">
                                                    <button onClick={() => { setEditingEntry({ dayOfWeek: dayIndex + 1, startTime: time }); setIsModalOpen(true); }} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center text-lg">
                                                    +
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};