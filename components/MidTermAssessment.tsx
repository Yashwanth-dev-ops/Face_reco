import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AdminInfo, Year, Designation } from '../types';
import { MarkUpdate } from '../services/apiService';
import { exportMidTermMarksReportToCSV } from '../services/csvExportService';

interface MidTermAssessmentProps {
    currentUser: AdminInfo;
    studentDirectory: Map<string, StudentInfo>;
    departments: string[];
    onSaveMarks: (updates: MarkUpdate[]) => Promise<void>;
    canDownloadReport?: boolean;
    onLogAction?: (action: string, details: string) => void;
}

export const MidTermAssessment: React.FC<MidTermAssessmentProps> = ({ currentUser, studentDirectory, departments, onSaveMarks, canDownloadReport = false, onLogAction }) => {
    const [year, setYear] = useState<Year>(currentUser.designation === Designation.Incharge && currentUser.year ? currentUser.year : Year.First);
    const [department, setDepartment] = useState<string>(![Designation.Principal, Designation.VicePrincipal].includes(currentUser.designation) ? currentUser.department : (departments[0] || ''));
    const [section, setSection] = useState('ALL');
    const [subject, setSubject] = useState('');
    const [midTerm, setMidTerm] = useState<'mid1' | 'mid2'>('mid1');
    const [marks, setMarks] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [studentsLoaded, setStudentsLoaded] = useState(false);

    const isDeptDisabled = useMemo(() => {
        return ![Designation.Principal, Designation.VicePrincipal].includes(currentUser.designation);
    }, [currentUser.designation]);
    
    const isYearDisabled = currentUser.designation === Designation.Incharge;
    const isSectionDisabled = false;

    const filteredDepartments = useMemo(() => departments.filter(d => d !== 'Administration'), [departments]);

    const availableSections = useMemo(() => {
        const sections = new Set<string>();
        for (const student of studentDirectory.values()) {
            if (student.department === department && student.year === year) {
                sections.add(student.section);
            }
        }
        // Remove 'ALL' if it exists in the collected sections to avoid duplicates
        sections.delete('ALL');
        const sortedSections = Array.from(sections).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        // Prepend 'ALL' to the list of unique, sorted sections
        return ['ALL', ...sortedSections];
    }, [department, year, studentDirectory]);

    useEffect(() => {
        if (currentUser.designation === Designation.Incharge && currentUser.section && currentUser.section !== 'All Sections') {
            setSection(currentUser.section);
        }
    }, [currentUser]);

    useEffect(() => {
        if (!availableSections.includes(section)) {
            setSection('ALL');
            setStudentsLoaded(false);
        }
    }, [availableSections, section]);

    const filteredStudents = useMemo(() => {
        if (!studentsLoaded) return [];
        return Array.from(studentDirectory.values()).filter(
            s => s.year === year && s.department === department && (section === 'ALL' || s.section === section)
        ).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    }, [studentDirectory, year, department, section, studentsLoaded]);

    const handleLoadStudents = () => {
        setError('');
        setSuccess('');
        if (!subject.trim()) {
            setError("Please enter a subject name.");
            return;
        }
        const newMarks = new Map<string, string>();
        const students = Array.from(studentDirectory.values()).filter(
            s => s.year === year && s.department === department && (section === 'ALL' || s.section === section)
        );
        students.forEach(student => {
            const existingMark = student.marks?.find(m => m.subject.toLowerCase() === subject.trim().toLowerCase());
            if (existingMark && existingMark[midTerm] !== null) {
                newMarks.set(student.rollNumber, String(existingMark[midTerm]));
            } else {
                newMarks.set(student.rollNumber, '');
            }
        });
        setMarks(newMarks);
        setStudentsLoaded(true);
    };

    const handleMarkChange = (rollNumber: string, value: string) => {
        const newMarks = new Map(marks);
        newMarks.set(rollNumber, value);
        setMarks(newMarks);
    };

    const handleSaveChanges = async () => {
        setError('');
        setSuccess('');
        setIsLoading(true);

        const updates: MarkUpdate[] = [];
        let validationError = false;
        for (const [rollNumber, markStr] of marks.entries()) {
            if (markStr === '') {
                updates.push({ rollNumber, subject: subject.trim(), midTerm, marks: null });
                continue;
            }
            const markNum = Number(markStr);
            if (isNaN(markNum) || markNum < 0 || markNum > 100) {
                setError(`Invalid mark for ${rollNumber}. Marks must be between 0 and 100.`);
                validationError = true;
                break;
            }
            updates.push({ rollNumber, subject: subject.trim(), midTerm, marks: markNum });
        }

        if (validationError) {
            setIsLoading(false);
            return;
        }

        try {
            await onSaveMarks(updates);
            setSuccess("Marks updated successfully!");
        } catch (err) {
            setError("Failed to save marks. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadMarks = () => {
        const logDetails = `Downloaded Mid-Term Marks for Year: ${year}, Dept: ${department}, Sec: ${section}, Subject: ${subject.trim()}, Mid: ${midTerm}`;
        onLogAction?.('Download Marks Report', logDetails);
        exportMidTermMarksReportToCSV(filteredStudents);
    };

    return (
        <div className="bg-slate-900/50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold text-indigo-300 mb-4">Mid-Term Assessment</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border border-slate-700 rounded-lg mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
                    <select value={year} onChange={e => {setYear(e.target.value as Year); setStudentsLoaded(false);}} disabled={isYearDisabled} className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition disabled:bg-slate-700 disabled:cursor-not-allowed">
                        {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                    <select value={department} onChange={e => {setDepartment(e.target.value); setStudentsLoaded(false);}} disabled={isDeptDisabled} className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition disabled:bg-slate-700 disabled:cursor-not-allowed">
                        {filteredDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Section</label>
                    <select value={section} onChange={e => {setSection(e.target.value); setStudentsLoaded(false);}} disabled={isSectionDisabled} className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition disabled:bg-slate-700 disabled:cursor-not-allowed">
                        {availableSections.map(s => (
                            <option key={s} value={s}>
                                {s === 'ALL' ? 'All Sections' : `Section ${s}`}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                    <input type="text" value={subject} onChange={e => {setSubject(e.target.value); setStudentsLoaded(false);}} placeholder="e.g., Data Structures" className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mid-Term</label>
                    <select value={midTerm} onChange={e => {setMidTerm(e.target.value as 'mid1' | 'mid2'); setStudentsLoaded(false);}} className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition">
                        <option value="mid1">Mid-I</option>
                        <option value="mid2">Mid-II</option>
                    </select>
                </div>
            </div>
            
            <button onClick={handleLoadStudents} disabled={!subject.trim()} className="w-full mb-4 px-6 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                Load Students
            </button>

            {studentsLoaded && (
                <>
                    <div className="max-h-[50vh] overflow-y-auto mt-4 border border-slate-700 rounded-lg">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-900 z-10">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Roll Number</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Name</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 w-32">Marks ({midTerm.toUpperCase()})</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredStudents.map(student => (
                                    <tr key={student.rollNumber} className="hover:bg-slate-800/60">
                                        <td className="p-3 text-sm text-gray-300 font-mono">{student.rollNumber}</td>
                                        <td className="p-3 text-sm text-white">{student.name}</td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={marks.get(student.rollNumber) || ''}
                                                onChange={(e) => handleMarkChange(student.rollNumber, e.target.value)}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-center focus:ring-2 focus:ring-indigo-500 transition"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {filteredStudents.length === 0 && <p className="text-center p-8 text-gray-500">No students found for the selected criteria.</p>}
                    </div>
                    
                    {error && <p className="text-center text-sm text-red-400 mt-4">{error}</p>}
                    {success && <p className="text-center text-sm text-green-400 mt-4">{success}</p>}
                    
                    <div className="flex gap-4 mt-4">
                        <button onClick={handleSaveChanges} disabled={isLoading || filteredStudents.length === 0} className="w-full px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg disabled:opacity-50">
                            {isLoading ? 'Saving...' : 'Save All Marks'}
                        </button>
                        {canDownloadReport && (
                             <button onClick={handleDownloadMarks} disabled={isLoading || filteredStudents.length === 0} className="w-full px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg disabled:opacity-50">
                                Download Marks Report
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
