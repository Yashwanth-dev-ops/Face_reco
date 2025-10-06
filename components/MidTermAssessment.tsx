



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

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const MidTermAssessment: React.FC<MidTermAssessmentProps> = ({ currentUser, studentDirectory, departments, onSaveMarks, canDownloadReport = false, onLogAction }) => {
    
    const isDeptDisabled = useMemo(() => {
        // Disabled for HODs and Incharges, but enabled for Teachers, Principals, etc.
        return [Designation.HOD, Designation.Incharge].includes(currentUser.designation);
    }, [currentUser.designation]);

    const [year, setYear] = useState<Year>(currentUser.designation === Designation.Incharge && currentUser.year ? currentUser.year : Year.First);
    const [department, setDepartment] = useState<string>(isDeptDisabled ? currentUser.department : (departments[0] || ''));
    const [section, setSection] = useState('ALL');
    const [subject, setSubject] = useState('');
    const [midTerm, setMidTerm] = useState<'mid1' | 'mid2'>('mid1');
    const [marks, setMarks] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [studentsLoaded, setStudentsLoaded] = useState(false);

    
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
        // FIX: Explicitly type the iterator variable `s` to StudentInfo to prevent it from being inferred as `unknown`.
        return Array.from(studentDirectory.values()).filter(
            (s: StudentInfo) => s.year === year && s.department === department && (section === 'ALL' || s.section === section)
        // FIX: Explicitly type the iterator variables `a` and `b` to StudentInfo to prevent them from being inferred as `unknown`.
        ).sort((a: StudentInfo, b: StudentInfo) => a.rollNumber.localeCompare(b.rollNumber));
    }, [studentDirectory, year, department, section, studentsLoaded]);

    const handleLoadStudents = () => {
        setError('');
        setSuccess('');
        if (!subject.trim()) {
            setError("Please enter a subject name.");
            return;
        }
        const newMarks = new Map<string, string>();
        // FIX: Explicitly type the iterator variable `s` to StudentInfo to prevent it from being inferred as `unknown`.
        const students = Array.from(studentDirectory.values()).filter(
            (s: StudentInfo) => s.year === year && s.department === department && (section === 'ALL' || s.section === section)
        );
        // FIX: Explicitly type the iterator variable `student` to StudentInfo to prevent it from being inferred as `unknown`.
        students.forEach((student: StudentInfo) => {
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
        <div className="bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Mid-Term Assessment</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border border-gray-700/50 rounded-lg mb-4 bg-gray-900/30">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
                    <select value={year} onChange={e => {setYear(e.target.value as Year); setStudentsLoaded(false);}} disabled={isYearDisabled} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white transition disabled:bg-gray-700 disabled:cursor-not-allowed">
                        {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                    <select value={department} onChange={e => {setDepartment(e.target.value); setStudentsLoaded(false);}} disabled={isDeptDisabled} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white transition disabled:bg-gray-700 disabled:cursor-not-allowed">
                        {filteredDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Section</label>
                    <select value={section} onChange={e => {setSection(e.target.value); setStudentsLoaded(false);}} disabled={isSectionDisabled} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white transition disabled:bg-gray-700 disabled:cursor-not-allowed">
                        {availableSections.map(s => (
                            <option key={s} value={s}>
                                {s === 'ALL' ? 'All Sections' : `Section ${s}`}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                    <input type="text" value={subject} onChange={e => {setSubject(e.target.value); setStudentsLoaded(false);}} placeholder="e.g., Data Structures" className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white transition" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mid-Term</label>
                    <select value={midTerm} onChange={e => {setMidTerm(e.target.value as 'mid1' | 'mid2'); setStudentsLoaded(false);}} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white transition">
                        <option value="mid1">Mid-I</option>
                        <option value="mid2">Mid-II</option>
                    </select>
                </div>
            </div>
            
            <button onMouseMove={handleMouseMove} onClick={handleLoadStudents} disabled={!subject.trim()} className="btn-animated w-full mb-4 px-6 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="btn-content">
                    <span className="btn-dot"></span>
                    <span>Load Students</span>
                </span>
            </button>

            {studentsLoaded && (
                <>
                    <div className="max-h-[50vh] overflow-y-auto mt-4 border border-gray-700 rounded-lg">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-gray-800 z-10">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Roll Number</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Name</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 w-32">Marks ({midTerm.toUpperCase()})</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {filteredStudents.map(student => (
                                    <tr key={student.rollNumber} className="hover:bg-gray-700/50">
                                        <td className="p-3 text-sm text-gray-300 font-mono">{student.rollNumber}</td>
                                        <td className="p-3 text-sm text-white">{student.name}</td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={marks.get(student.rollNumber) || ''}
                                                onChange={(e) => handleMarkChange(student.rollNumber, e.target.value)}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-center transition"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {filteredStudents.length === 0 && <p className="text-center p-8 text-gray-500">No students found for the selected criteria.</p>}
                    </div>
                    
                    <div className="text-center text-sm mt-4 h-5">
                        {error && <p className="text-red-400">{error}</p>}
                        {success && <p className="text-green-400">{success}</p>}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <button onMouseMove={handleMouseMove} onClick={handleSaveChanges} disabled={isLoading || filteredStudents.length === 0} className="btn-animated w-full px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-all shadow-lg disabled:opacity-50">
                            <span className="btn-content">
                                <span className="btn-dot"></span>
                                <span>{isLoading ? 'Saving...' : 'Save All Marks'}</span>
                            </span>
                        </button>
                        {canDownloadReport && (
                             <button onMouseMove={handleMouseMove} onClick={handleDownloadMarks} disabled={isLoading || filteredStudents.length === 0} className="btn-animated w-full px-6 py-3 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-500 transition-all shadow-lg disabled:opacity-50">
                                <span className="btn-content">
                                    <span className="btn-dot"></span>
                                    <span>Download Marks Report</span>
                                </span>
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
