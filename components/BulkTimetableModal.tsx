import React, { useState, useMemo } from 'react';
import { TimeTableEntry, AdminInfo, Year } from '../types';

interface BulkTimetableModalProps {
    onClose: () => void;
    onSave: (newEntries: TimeTableEntry[]) => void;
    existingEntries: TimeTableEntry[];
    teachers: AdminInfo[];
    departments: string[];
}

type ParsedEntry = Omit<TimeTableEntry, 'id' | 'endTime'>;
type PreviewData = {
    valid: TimeTableEntry[];
    invalid: { line: number; data: any; reason: string }[];
};

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


export const BulkTimetableModal: React.FC<BulkTimetableModalProps> = ({ onClose, onSave, existingEntries, teachers, departments }) => {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);

    const teacherIds = useMemo(() => new Set(teachers.map(t => t.idNumber)), [teachers]);
    const validDepartments = useMemo(() => new Set(departments), [departments]);
    const validYears = useMemo(() => new Set(Object.values(Year)), []);

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
                const headers = lines[0].split(',').map(h => h.trim());
                const requiredHeaders = ['dayOfWeek', 'startTime', 'subject', 'teacherId', 'department', 'year', 'section'];
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    throw new Error(`CSV must have headers: ${requiredHeaders.join(', ')}.`);
                }

                const valid: TimeTableEntry[] = [];
                const invalid: { line: number, data: any, reason: string }[] = [];
                const tempEntriesForConflictCheck = [...existingEntries];

                lines.slice(1).forEach((line, index) => {
                    const values = line.split(',');
                    const entryData = headers.reduce((obj, header, i) => ({ ...obj, [header]: values[i]?.trim() }), {} as any);
                    const lineNumber = index + 2;

                    // Basic Validation
                    const day = parseInt(entryData.dayOfWeek, 10);
                    if (isNaN(day) || day < 1 || day > 6) {
                        invalid.push({ line: lineNumber, data: entryData, reason: 'Invalid dayOfWeek (must be 1-6).' });
                        return;
                    }
                    if (!/^\d{2}:\d{2}$/.test(entryData.startTime)) {
                        invalid.push({ line: lineNumber, data: entryData, reason: 'Invalid startTime format (must be HH:MM).' });
                        return;
                    }
                    if (!teacherIds.has(entryData.teacherId)) {
                         invalid.push({ line: lineNumber, data: entryData, reason: `Teacher ID "${entryData.teacherId}" not found.` });
                        return;
                    }
                    if (!validDepartments.has(entryData.department)) {
                        invalid.push({ line: lineNumber, data: entryData, reason: `Department "${entryData.department}" is not valid.` });
                        return;
                    }
                     if (!validYears.has(entryData.year)) {
                        invalid.push({ line: lineNumber, data: entryData, reason: `Year "${entryData.year}" is not valid.` });
                        return;
                    }

                    const endTime = `${String(parseInt(entryData.startTime.split(':')[0]) + 1).padStart(2, '0')}:00`;
                    const newEntry: TimeTableEntry = {
                        id: `${day}-${entryData.startTime}-${entryData.department}-${entryData.year}-${entryData.section}`,
                        endTime,
                        ...entryData,
                        dayOfWeek: day
                    };

                    // Conflict Detection
                    const classConflict = tempEntriesForConflictCheck.find(e => e.dayOfWeek === newEntry.dayOfWeek && e.startTime === newEntry.startTime && e.department === newEntry.department && e.year === newEntry.year && e.section === newEntry.section);
                    if (classConflict) {
                        invalid.push({ line: lineNumber, data: entryData, reason: `Class conflict: This group already has a class scheduled.` });
                        return;
                    }
                    const teacherConflict = tempEntriesForConflictCheck.find(e => e.dayOfWeek === newEntry.dayOfWeek && e.startTime === newEntry.startTime && e.teacherId === newEntry.teacherId);
                    if (teacherConflict) {
                        invalid.push({ line: lineNumber, data: entryData, reason: `Teacher conflict: ${entryData.teacherId} is already scheduled.` });
                        return;
                    }

                    valid.push(newEntry);
                    tempEntriesForConflictCheck.push(newEntry);
                });

                setPreviewData({ valid, invalid });
                setStep('preview');

            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to parse CSV.");
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const headers = 'dayOfWeek,startTime,subject,teacherId,department,year,section';
        const exampleRow = '1,09:00,Data Structures,teacher-cse,CSE,2nd Year,1';
        const csvContent = `${headers}\n${exampleRow}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'timetable_template.csv';
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-4">Bulk Add Classes</h2>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <p className="text-gray-400">Upload a CSV file to add multiple classes to the timetable at once.</p>
                        <button onClick={handleDownloadTemplate} className="text-sm font-semibold text-blue-400 hover:underline">Download CSV Template</button>
                        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileParse} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"/>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                    </div>
                )}
                
                {step === 'preview' && previewData && (
                    <div className="flex-grow flex flex-col min-h-0">
                        <p className="text-gray-300 mb-4">Previewing <span className="font-mono text-blue-400">{fileName}</span>. Found <span className="font-bold text-green-400">{previewData.valid.length} valid</span> and <span className="font-bold text-red-400">{previewData.invalid.length} invalid</span> entries.</p>
                        
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                           {previewData.valid.length > 0 && (
                               <div>
                                   <h4 className="font-semibold text-green-400 flex items-center gap-2"><CheckCircleIcon /> Valid entries to be added</h4>
                                   <div className="max-h-48 overflow-y-auto mt-2 bg-gray-900/50 p-2 rounded-md">
                                       <ul className="text-xs space-y-1">
                                           {previewData.valid.map(e => <li key={e.id} className="font-mono">{`[${e.startTime}] ${e.subject} for ${e.department}/${e.year.replace(' Year','Y')}/S${e.section} by ${e.teacherId}`}</li>)}
                                       </ul>
                                   </div>
                               </div>
                           )}
                            {previewData.invalid.length > 0 && (
                               <div>
                                   <h4 className="font-semibold text-red-400 flex items-center gap-2"><XCircleIcon /> Invalid entries (will be ignored)</h4>
                                   <div className="max-h-48 overflow-y-auto mt-2 bg-gray-900/50 p-2 rounded-md">
                                        <ul className="text-xs space-y-2">
                                           {previewData.invalid.map(e => <li key={e.line}>{`Line ${e.line}: ${e.reason}`} <span className="text-gray-500 block">{JSON.stringify(e.data)}</span></li>)}
                                       </ul>
                                   </div>
                               </div>
                           )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-slate-700">
                    <button onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                    {step === 'preview' && (
                        <button onClick={() => onSave(previewData?.valid || [])} disabled={!previewData || previewData.valid.length === 0} className="px-6 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50">
                            Add {previewData?.valid.length || 0} Classes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
