import React, { useState, useMemo } from 'react';
import { StudentInfo, AttendanceRecord, Emotion, MidTermMarks } from '../types';
import { emotionUIConfig } from './uiConfig';
import { detectSingleFaceEmotion } from '../services/geminiService';
import { AttendanceStatusPanel } from './AttendanceStatusPanel';
import { AttendanceCaptureModal } from './AttendanceCaptureModal';
import { AttendanceCalendar } from './AttendanceCalendar';

interface StudentDashboardProps {
    currentUser: StudentInfo;
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    onLogout: () => void;
    onLogAttendance: (persistentId: number, emotion: Emotion) => void;
    onLinkFace: () => Promise<void>;
}

const EmptyLogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const getWorkingDaysInMonth = (year: number, month: number): number => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();
    
    let workingDays = 0;
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) { // Monday to Friday
            workingDays++;
        }
    }
    return workingDays;
};

interface MonthlyStat {
    key: string;
    monthName: string;
    presentDays: number;
    workingDays: number;
    percentage: number;
}

const MonthlyAttendanceSummary: React.FC<{ monthlyStats: MonthlyStat[] }> = ({ monthlyStats }) => {
    if (monthlyStats.length === 0) {
        return null;
    }

    return (
        <div className="mt-6">
            <h3 className="text-xl font-bold text-gray-200 mb-4">Monthly Attendance Summary</h3>
            <div className="bg-slate-900/50 rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
                        <tr>
                            <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider">Month</th>
                            <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider text-center">Present</th>
                            <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider text-center">Working Days</th>
                            <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider text-center">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {monthlyStats.map(stat => (
                            <tr key={stat.key} className="hover:bg-slate-800/60 transition-colors">
                                <td className="p-3 text-sm text-gray-300 font-semibold">{stat.monthName}</td>
                                <td className="p-3 text-sm text-gray-300 text-center font-mono">{stat.presentDays}</td>
                                <td className="p-3 text-sm text-gray-300 text-center font-mono">{stat.workingDays}</td>
                                <td className="p-3 text-sm text-white font-bold text-center font-mono">{stat.percentage}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StudentMarksPanel: React.FC<{ marks: MidTermMarks[] }> = ({ marks }) => {
    return (
        <div className="mt-6">
            <h3 className="text-xl font-bold text-gray-200 mb-4">Mid-Term Marks</h3>
            <div className="bg-slate-900/50 rounded-lg max-h-60 overflow-y-auto">
                {(!marks || marks.length === 0) ? (
                    <p className="text-center text-gray-500 p-8">No mid-term marks have been entered yet.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
                            <tr>
                                <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider">Subject</th>
                                <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider text-center">Mid-I Marks</th>
                                <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider text-center">Mid-II Marks</th>
                                <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider text-center">Average</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {marks.map(mark => {
                                let average: string | number = 'N/A';
                                if (mark.mid1 !== null && mark.mid2 !== null) {
                                    average = ((mark.mid1 + mark.mid2) / 2).toFixed(2);
                                }
                                return (
                                    <tr key={mark.subject} className="hover:bg-slate-800/60 transition-colors">
                                        <td className="p-3 text-sm text-gray-300 font-semibold">{mark.subject}</td>
                                        <td className="p-3 text-sm text-white text-center font-mono">{mark.mid1 ?? 'N/A'}</td>
                                        <td className="p-3 text-sm text-white text-center font-mono">{mark.mid2 ?? 'N/A'}</td>
                                        <td className="p-3 text-sm text-white text-center font-mono font-bold">{average}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};


export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser, attendance, faceLinks, onLogout, onLogAttendance, onLinkFace }) => {
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [captureMode, setCaptureMode] = useState<'MARK' | 'LINK'>('MARK');

    const studentPersistentId = useMemo(() => {
        for (const [pid, roll] of faceLinks.entries()) {
            if (roll === currentUser.rollNumber) return pid;
        }
        return null;
    }, [faceLinks, currentUser.rollNumber]);

    const isFaceLinked = studentPersistentId !== null;

    const studentAttendance = useMemo(() => {
        if (studentPersistentId === null) return [];
        return attendance
            .filter(record => record.persistentId === studentPersistentId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [attendance, studentPersistentId]);
    
    const todaysAttendance = useMemo(() => {
        const today = new Date().toDateString();
        return studentAttendance.find(rec => new Date(rec.timestamp).toDateString() === today);
    }, [studentAttendance]);

    const attendanceStatus = useMemo(() => {
        if (currentUser.isBlocked) return 'BLOCKED';
        if (!isFaceLinked) return 'UNLINKED';
        if (todaysAttendance) return 'PRESENT';
        return 'ABSENT';
    }, [currentUser.isBlocked, isFaceLinked, todaysAttendance]);

    const monthlyStats = useMemo<MonthlyStat[]>(() => {
        const stats: { [key: string]: { present: Set<string>, year: number, month: number } } = {};
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        studentAttendance.forEach(record => {
            const date = new Date(record.timestamp);
            const year = date.getFullYear();
            const month = date.getMonth();
            const key = `${year}-${month}`;

            if (!stats[key]) {
                stats[key] = { present: new Set(), year, month };
            }
            stats[key].present.add(date.toDateString());
        });

        return Object.values(stats)
            .map(stat => {
                const workingDays = getWorkingDaysInMonth(stat.year, stat.month);
                const presentDays = stat.present.size;
                const percentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
                return {
                    key: `${stat.year}-${stat.month}`,
                    monthName: `${monthNames[stat.month]} ${stat.year}`,
                    presentDays,
                    workingDays,
                    percentage,
                };
            })
            .sort((a, b) => b.key.localeCompare(a.key)); // Sort descending by date
    }, [studentAttendance]);

    const attendanceStats = useMemo(() => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
        
        const currentMonthData = monthlyStats.find(stat => stat.key === currentMonthKey);

        if (currentMonthData) {
            return {
                daysPresent: currentMonthData.presentDays,
                totalDays: currentMonthData.workingDays,
                percentage: currentMonthData.percentage
            };
        }

        return {
            daysPresent: 0,
            totalDays: getWorkingDaysInMonth(now.getFullYear(), now.getMonth()),
            percentage: 0
        };
    }, [monthlyStats]);


    const handleMarkAttendance = async (base64Data: string) => {
        if (currentUser.isBlocked || !isFaceLinked || studentPersistentId === null) {
            throw new Error("Cannot mark attendance at this time.");
        }
    
        try {
            const result = await detectSingleFaceEmotion(base64Data);
            if (result && result.emotion) {
                onLogAttendance(studentPersistentId, result.emotion);
            } else {
                throw new Error("No face detected. Please ensure you are clearly visible in the photo.");
            }
        } catch (err) {
            console.error("API Error marking attendance:", err);
            if (err instanceof Error && err.message === "RATE_LIMIT") {
                throw new Error("Trying too frequently. Please wait a moment before marking again.");
            }
            const message = err instanceof Error ? err.message : "Could not verify attendance due to an API error. Please try again.";
            throw new Error(message);
        }
    };
    
    const handleLinkFace = async (base64Data: string) => {
        if (currentUser.isBlocked) {
            throw new Error("Cannot link face while account is blocked.");
        }
        try {
            await onLinkFace();
        } catch (err) {
            console.error("Link Face Error:", err);
            throw err;
        }
    };

    const handleCapture = (base64Data: string) => {
        if (captureMode === 'MARK') {
            return handleMarkAttendance(base64Data);
        } else {
            return handleLinkFace(base64Data);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col animate-fade-in">
             {isCaptureModalOpen && (
                <AttendanceCaptureModal
                    onClose={() => setIsCaptureModalOpen(false)}
                    onCapture={handleCapture}
                    title={captureMode === 'MARK' ? "Mark Attendance" : "Link Face ID"}
                    actionText={captureMode === 'MARK' ? "Capture & Mark" : "Capture & Link"}
                />
            )}
             <header className="mb-6 w-full flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {currentUser.photoBase64 ? (
                        <img src={currentUser.photoBase64} alt={currentUser.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-600" />
                    ) : (
                        <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-14 h-14 rounded-full" />
                    )}
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-200">Welcome, {currentUser.name}!</h1>
                        <p className="text-sm text-gray-400">{currentUser.rollNumber}</p>
                    </div>
                </div>
                <button onClick={onLogout} className="px-4 py-2 rounded-md font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-transform duration-100 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 active:translate-y-0.5 shadow-lg">
                    Logout
                </button>
            </header>

            <main className="w-full bg-slate-800/40 rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-800 backdrop-blur-sm">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <AttendanceStatusPanel
                            status={attendanceStatus}
                            lastLogTime={todaysAttendance ? new Date(todaysAttendance.timestamp) : null}
                            onMarkAttendanceClick={() => {
                                setCaptureMode('MARK');
                                setIsCaptureModalOpen(true);
                            }}
                            onLinkFaceClick={() => {
                                setCaptureMode('LINK');
                                setIsCaptureModalOpen(true);
                            }}
                         />
                         <AttendanceCalendar studentAttendance={studentAttendance} />
                    </div>

                    <div className="lg:col-span-3">
                         <div className="bg-slate-900/50 p-6 rounded-lg mb-6">
                            <h3 className="text-xl font-bold text-gray-200 mb-4">Profile & Monthly Stats</h3>
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex-1 space-y-2 text-sm">
                                    <p className="flex justify-between"><span className="text-gray-400">Department:</span> <span className="font-semibold text-white">{currentUser.department}</span></p>
                                    <p className="flex justify-between"><span className="text-gray-400">Year:</span> <span className="font-semibold text-white">{currentUser.year}</span></p>
                                </div>
                                <div className="flex-1 space-y-2 text-sm border-t sm:border-t-0 sm:border-l border-slate-700 pt-4 sm:pt-0 sm:pl-6">
                                    <p className="flex justify-between"><span className="text-gray-400">Days Present (This Month):</span> <span className="font-semibold text-white">{attendanceStats.daysPresent} / {attendanceStats.totalDays}</span></p>
                                    <div>
                                        <p className="text-gray-400 mb-1">Attendance % (This Month):</p>
                                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                                            <div className="bg-gradient-to-r from-teal-400 to-cyan-500 h-2.5 rounded-full" style={{width: `${attendanceStats.percentage}%`}}></div>
                                        </div>
                                        <p className="text-right font-bold text-white mt-1">{attendanceStats.percentage}%</p>
                                    </div>
                                </div>
                            </div>
                         </div>

                         <h3 className="text-xl font-bold text-gray-200 mb-4">Full Attendance Log</h3>
                         <div className="bg-slate-900/50 rounded-lg max-h-[40vh] overflow-y-auto">
                            {studentAttendance.length === 0 ? (
                                <div className="text-center text-gray-500 p-8">
                                    <EmptyLogIcon />
                                    <h4 className="mt-4 text-lg font-semibold text-gray-400">No History Yet</h4>
                                    <p className="mt-1 text-sm">Your attendance records will appear here once you start logging them.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider border-b-2 border-slate-800">Date</th>
                                            <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider border-b-2 border-slate-800">Time</th>
                                            <th className="p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider border-b-2 border-slate-800">Emotion</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {studentAttendance.map(record => {
                                            const date = new Date(record.timestamp);
                                            return (
                                                <tr key={record.timestamp} className="hover:bg-slate-800/60 transition-colors">
                                                    <td className="p-3 text-sm text-gray-300 font-mono">{date.toLocaleDateString()}</td>
                                                    <td className="p-3 text-sm text-gray-300 font-mono">{date.toLocaleTimeString()}</td>
                                                    <td className="p-3 text-sm text-gray-300 flex items-center gap-2">
                                                        <span className="text-lg">{emotionUIConfig[record.emotion].emoji}</span>
                                                        <span>{record.emotion}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                         </div>
                         <StudentMarksPanel marks={currentUser.marks || []} />
                         <MonthlyAttendanceSummary monthlyStats={monthlyStats} />
                    </div>
                </div>
            </main>
        </div>
    );
};