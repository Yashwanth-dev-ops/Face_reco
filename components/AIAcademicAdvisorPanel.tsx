
import React, { useState, useMemo } from 'react';
import { StudentInfo, AttendanceRecord, TimeTableEntry } from '../types';
import * as geminiService from '../services/geminiService';
import { SparklesIcon } from './SparklesIcon';

interface AIAcademicAdvisorPanelProps {
    currentUser: StudentInfo;
    attendance: AttendanceRecord[];
    timeTable: TimeTableEntry[];
}

const LoadingSpinner: React.FC = () => (
    <div className="w-6 h-6 border-2 border-t-2 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
);

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const AIAcademicAdvisorPanel: React.FC<AIAcademicAdvisorPanelProps> = ({ currentUser, attendance, timeTable }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setError(null);
        setReport(null);

        try {
            // 1. Calculate total classes for each subject for this student
            const studentClasses = timeTable.filter(entry => 
                entry.department === currentUser.department &&
                entry.year === currentUser.year &&
                entry.section === currentUser.section
            );
            const totalClassesPerSubject = studentClasses.reduce((acc, entry) => {
                acc[entry.subject] = (acc[entry.subject] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // 2. Calculate attendance count for each subject
            const attendedClassesPerSubject = attendance.reduce((acc, record) => {
                if (record.subject) {
                    acc[record.subject] = (acc[record.subject] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            // 3. Format data for the AI
            const contextLines: string[] = [];
            contextLines.push(`Student: ${currentUser.name}, Roll No: ${currentUser.rollNumber}`);
            
            contextLines.push("\n## Attendance Summary");
            Object.keys(totalClassesPerSubject).forEach(subject => {
                const total = totalClassesPerSubject[subject];
                const attended = attendedClassesPerSubject[subject] || 0;
                const percentage = total > 0 ? ((attended / total) * 100).toFixed(0) : 0;
                contextLines.push(`- ${subject}: Attended ${attended} of ${total} classes (${percentage}%)`);
            });

            contextLines.push("\n## Mid-Term Marks Summary");
            if (currentUser.marks && currentUser.marks.length > 0) {
                 currentUser.marks.forEach(mark => {
                    contextLines.push(`- ${mark.subject}: Mid-I: ${mark.mid1 ?? 'N/A'}, Mid-II: ${mark.mid2 ?? 'N/A'}`);
                 });
            } else {
                contextLines.push("No marks data available.");
            }

            const context = contextLines.join('\n');
            
            // 4. Call Gemini service
            const generatedReport = await geminiService.generateStudentPerformanceReport(context);
            setReport(generatedReport);

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while generating the report.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Simple markdown to HTML renderer
    const renderMarkdown = (text: string) => {
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>') // Bold
            .replace(/\n\s*-\s*(.*)/g, '<li class="ml-4">$1</li>') // List items
            .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>'); // Wrap lists
        return { __html: html };
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">AI Academic Advisor</h3>
            
            {!report && !isLoading && (
                <div className="text-center flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Get personalized insights on your academic performance.</p>
                    <button onMouseMove={handleMouseMove} onClick={handleGenerateReport} className="btn-animated px-6 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md">
                        <span className="btn-content">
                            <SparklesIcon className="w-5 h-5" />
                            <span>Generate Performance Report</span>
                        </span>
                    </button>
                </div>
            )}
            
            {isLoading && (
                <div className="text-center flex flex-col items-center justify-center h-full">
                    <LoadingSpinner />
                    <p className="text-gray-500 dark:text-gray-400 mt-3">Your AI advisor is analyzing your data...</p>
                </div>
            )}

            {error && (
                <div className="text-center p-4 bg-red-900/40 text-red-300 rounded-lg h-full flex flex-col items-center justify-center">
                    <p className="font-bold">Failed to Generate Report</p>
                    <p className="text-sm">{error}</p>
                    <button onClick={handleGenerateReport} className="mt-4 px-4 py-1 text-xs font-semibold bg-gray-600 rounded-md">Try Again</button>
                </div>
            )}

            {report && (
                <div className="animate-fade-in space-y-4">
                    <div className="prose prose-invert text-gray-300 bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-64 overflow-y-auto">
                        <div dangerouslySetInnerHTML={renderMarkdown(report)} />
                    </div>
                     <button onClick={handleGenerateReport} className="text-xs font-semibold text-blue-400 hover:underline">
                        Regenerate Report
                    </button>
                </div>
            )}

        </div>
    );
};
