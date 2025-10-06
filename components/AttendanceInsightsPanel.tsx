import React, { useState, useMemo } from 'react';
import { StudentInfo, AdminInfo, AttendanceAnomaly, Designation } from '../types';
import { SparklesIcon } from './SparklesIcon';

interface AttendanceInsightsPanelProps {
    students: StudentInfo[];
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
    onGetAnomalies: (studentsToAnalyze: StudentInfo[]) => Promise<AttendanceAnomaly[]>;
    onSendMessage: (receiverId: string, content: string, isPriority?: boolean) => Promise<void>;
    onLogAction: (action: string, details: string) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
);

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};


const AnomalyCard: React.FC<{
    anomaly: AttendanceAnomaly;
    student: StudentInfo;
    incharge?: AdminInfo;
    onSendMessage: (receiverId: string, content: string, isPriority?: boolean) => Promise<void>;
    onLogAction: (action: string, details: string) => void;
}> = ({ anomaly, student, incharge, onSendMessage, onLogAction }) => {
    const severityClasses = {
        High: { bg: 'bg-red-900/40', border: 'border-red-500', text: 'text-red-400' },
        Medium: { bg: 'bg-yellow-900/40', border: 'border-yellow-500', text: 'text-yellow-400' },
        Low: { bg: 'bg-blue-900/40', border: 'border-blue-500', text: 'text-blue-400' },
    };
    const classes = severityClasses[anomaly.severity];

    const handleNotifyIncharge = () => {
        if (!incharge) return;
        const details = `Notified Incharge ${incharge.name} about attendance anomaly for student ${student.name} (${student.rollNumber}). Anomaly: ${anomaly.anomalyType}.`;
        onSendMessage(incharge.idNumber, `[ATTENDANCE ALERT] Please review the attendance for ${student.name} (${student.rollNumber}). The system detected the following anomaly: "${anomaly.anomalyType} - ${anomaly.summary}"`, true);
        onLogAction('Notify Incharge', details);
        // In a real app, this would trigger an email or other notification
        alert(`A priority message has been sent to Incharge: ${incharge.name}`);
    };

    return (
        <div className={`p-4 rounded-lg border-l-4 ${classes.bg} ${classes.border} animate-fade-in`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className={`text-sm font-bold ${classes.text}`}>{anomaly.anomalyType}</p>
                    <p className="font-bold text-white mt-1">{student.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{student.rollNumber}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${classes.bg} ${classes.text}`}>{anomaly.severity}</span>
            </div>
            <p className="text-sm text-gray-300 mt-3">{anomaly.summary}</p>
            <div className="mt-4 pt-3 border-t border-gray-700/50 flex gap-2">
                <button onClick={() => onSendMessage(student.rollNumber, `Hi ${student.name}, this is a message regarding your recent attendance. Please get in touch.`)} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-md transition-colors">
                    Message Student
                </button>
                {incharge && (
                     <button onClick={handleNotifyIncharge} className="text-xs font-semibold text-white bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded-md transition-colors">
                        Notify Incharge
                    </button>
                )}
            </div>
        </div>
    );
};

export const AttendanceInsightsPanel: React.FC<AttendanceInsightsPanelProps> = ({
    students,
    studentDirectory,
    adminDirectory,
    onGetAnomalies,
    onSendMessage,
    onLogAction
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [anomalies, setAnomalies] = useState<AttendanceAnomaly[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [scanPerformed, setScanPerformed] = useState(false);
    
    const handleScan = async () => {
        setIsLoading(true);
        setError(null);
        setAnomalies([]);
        setScanPerformed(true);

        try {
            const results = await onGetAnomalies(students);
            setAnomalies(results.sort((a, b) => {
                const severityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const incharges = useMemo(() => {
        return Array.from(adminDirectory.values()).filter((a: AdminInfo) => a.designation === Designation.Incharge);
    }, [adminDirectory]);
    
    const getInchargeForStudent = (student: StudentInfo) => {
        let incharge = incharges.find(i => i.department === student.department && i.year === student.year && i.section === student.section);
        if (!incharge) {
            incharge = incharges.find(i => i.department === student.department && i.year === student.year && i.section === 'All Sections');
        }
        return incharge;
    };

    return (
        <div className="bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-2">AI Attendance Insights</h3>
            <p className="text-sm text-gray-400 mb-4">Scan the currently filtered students for unusual attendance patterns that may require intervention. This process may take a moment.</p>

            <button onMouseMove={handleMouseMove} onClick={handleScan} disabled={isLoading || students.length === 0} className="btn-animated w-full mb-6 px-6 py-3 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                 <span className="btn-content">
                    <SparklesIcon className="w-5 h-5" />
                    <span>{isLoading ? 'Scanning...' : `Scan ${students.length} Students for Anomalies`}</span>
                </span>
            </button>

            <div className="min-h-[40vh] flex flex-col">
                {isLoading && (
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <LoadingSpinner />
                        <p className="mt-4 text-gray-400">AI is analyzing attendance data...</p>
                    </div>
                )}
                {!isLoading && scanPerformed && (
                    <>
                        {anomalies.length > 0 ? (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {anomalies.map(anomaly => {
                                    const student = studentDirectory.get(anomaly.studentRollNumber);
                                    if (!student) return null;
                                    const incharge = getInchargeForStudent(student);
                                    return <AnomalyCard key={anomaly.studentRollNumber} anomaly={anomaly} student={student} incharge={incharge} onSendMessage={onSendMessage} onLogAction={onLogAction} />;
                                })}
                            </div>
                        ) : (
                             <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="mt-4 text-lg font-semibold text-gray-400">No significant anomalies detected.</p>
                                <p className="text-sm">All student attendance patterns appear to be within normal parameters.</p>
                            </div>
                        )}
                    </>
                )}
                 {!isLoading && !scanPerformed && (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
                        <p>Click the scan button to begin the analysis of the {students.length} filtered students.</p>
                    </div>
                )}
                {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>
        </div>
    );
};
