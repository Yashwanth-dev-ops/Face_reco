



import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StudentInfo, AttendanceRecord, Emotion, DetectionResult } from '../types';
import { emotionUIConfig } from './uiConfig';
import { detectFacesAndHands } from '../services/geminiService';
import { CameraIcon } from './CameraIcon';

interface StudentDashboardProps {
    currentUser: StudentInfo;
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    onLogout: () => void;
    onLogAttendance: (persistentId: number, emotion: Emotion) => void;
    onLinkFace: () => Promise<void>;
}

const StatusCard: React.FC<{ 
    isBlocked: boolean;
    isFaceLinked: boolean;
    cameraActive: boolean;
    lastLogTimestamp: number | null;
}> = ({ isBlocked, isFaceLinked, cameraActive, lastLogTimestamp }) => {
    
    let icon: React.ReactNode;
    let title: string;
    let message: string;
    let bgColor: string;
    let borderColor: string;
    let titleColor: string;
    
    if (isBlocked) {
        icon = (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
        );
        title = 'ACCOUNT BLOCKED';
        message = "Your account has been blocked. You cannot be marked present.";
        bgColor = 'bg-red-900/40';
        borderColor = 'border-red-700/50';
        titleColor = 'text-red-400';
    } else if (!isFaceLinked) {
        icon = (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
        title = 'FACE NOT LINKED';
        message = "Link your face to enable attendance marking. Start the camera and click 'Link My Face' below.";
        bgColor = 'bg-yellow-900/40';
        borderColor = 'border-yellow-700/50';
        titleColor = 'text-yellow-400';
    } else if (lastLogTimestamp) {
         icon = (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        title = 'ATTENDANCE MARKED';
        message = `Last marked at ${new Date(lastLogTimestamp).toLocaleTimeString()}. You can mark again if needed.`;
        bgColor = 'bg-green-900/40';
        borderColor = 'border-green-700/50';
        titleColor = 'text-green-400';
    } else if (cameraActive) {
         icon = (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        );
        title = 'READY TO MARK';
        message = "Camera is active. Click 'Mark My Attendance' to log your presence.";
        bgColor = 'bg-blue-900/40';
        borderColor = 'border-blue-700/50';
        titleColor = 'text-blue-400';
    } else { // Camera Inactive / Idle
         icon = (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a2 2 0 01.45 2.12A12.01 12.01 0 0112 21a12.035 12.035 0 01-8-3.32 2 2 0 01.45-2.12L9 10m0 0h6m-6 0a3 3 0 01-3-3V6a3 3 0 013-3h6a3 3 0 013 3v1a3 3 0 01-3 3" />
            </svg>
        );
        title = 'CAMERA INACTIVE';
        message = "Start your camera and use the button below to mark your attendance or link your face.";
        bgColor = 'bg-slate-700/40';
        borderColor = 'border-slate-600/50';
        titleColor = 'text-gray-400';
    }

    return (
        <div className={`p-4 rounded-lg ${bgColor} border ${borderColor} transition-all duration-300`}>
            <h3 className="text-lg font-bold text-gray-200 mb-2">Live Attendance Status</h3>
            <div className="flex items-center gap-4">
                {icon}
                <div>
                    <p className={`text-xl font-black ${titleColor}`}>
                        {title}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{message}</p>
                </div>
            </div>
        </div>
    );
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser, attendance, faceLinks, onLogout, onLogAttendance, onLinkFace }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<{title: string, message: string} | null>(null);
    const [isMarking, setIsMarking] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isProcessing = useRef(false);

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
    
    const lastLogTimestamp = studentAttendance[0]?.timestamp || null;

    const handleStartCamera = async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError({ title: "Camera Error", message: "Could not access the camera. Please check permissions." });
        }
    };

    const handleStopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleMarkAttendance = async () => {
        if (isProcessing.current || !videoRef.current || !canvasRef.current || !stream || currentUser.isBlocked || !isFaceLinked) return;
    
        setIsMarking(true);
        isProcessing.current = true;
        setError(null);
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) {
            setIsMarking(false);
            isProcessing.current = false;
            return;
        }
    
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        try {
            const result = await detectFacesAndHands(base64Data);
            if (result.faces.length > 0 && studentPersistentId !== null) {
                const face = result.faces[0];
                onLogAttendance(studentPersistentId, face.emotion);
            } else {
                setError({ title: "Face Not Detected", message: "Could not detect a face. Please ensure you are clearly visible." });
            }
        } catch (err) {
            console.error("API Error:", err);
            if (err instanceof Error && err.message === "RATE_LIMIT") {
                setError({ title: "Trying Too Frequently", message: "Please wait a moment before marking attendance again." });
            } else {
                setError({ title: "Analysis Failed", message: "Could not verify attendance. Please try again." });
            }
        } finally {
            setIsMarking(false);
            isProcessing.current = false;
        }
    };
    
    const handleLinkFace = async () => {
        if (isProcessing.current || !videoRef.current || !canvasRef.current || !stream || currentUser.isBlocked) return;

        setIsLinking(true);
        isProcessing.current = true;
        setError(null);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) {
            setIsLinking(false);
            isProcessing.current = false;
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

        try {
            const result = await detectFacesAndHands(base64Data);
            if (result.faces.length > 0) {
                await onLinkFace();
            } else {
                setError({ title: "Face Not Detected", message: "Could not detect a face. Please ensure you are clearly visible and well-lit." });
            }
        } catch (err) {
            console.error("Link Face Error:", err);
            if (err instanceof Error && err.message === "RATE_LIMIT") {
                setError({ title: "Trying Too Frequently", message: "Please wait a moment before trying to link your face again." });
            } else {
                setError({ title: "Linking Failed", message: err instanceof Error ? err.message : "Could not link your face. Please try again." });
            }
        } finally {
            setIsLinking(false);
            isProcessing.current = false;
        }
    };


    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col animate-fade-in">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <StatusCard 
                            isBlocked={currentUser.isBlocked} 
                            isFaceLinked={isFaceLinked}
                            cameraActive={!!stream} 
                            lastLogTimestamp={lastLogTimestamp}
                        />

                        <div className={`relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-800 shadow-inner`}>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            {!stream && 
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 bg-opacity-80 p-4 text-center">
                                    <p className="text-gray-300">Start your camera to proceed.</p>
                                </div>
                            }
                        </div>
                        
                        {!currentUser.isBlocked && (
                             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={stream ? handleStopCamera : handleStartCamera}
                                    disabled={currentUser.isBlocked}
                                    className={`w-full sm:w-auto px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 flex items-center justify-center shadow-lg transform hover:scale-105 active:translate-y-0.5 ${
                                        stream
                                            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:ring-red-500 text-white'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-indigo-500 text-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                >
                                    <CameraIcon className="w-6 h-6 mr-3" />
                                    {stream ? 'Stop Camera' : 'Start Camera'}
                                </button>
                                
                                {isFaceLinked ? (
                                    <button
                                        onClick={handleMarkAttendance}
                                        disabled={!stream || isMarking}
                                        className="w-full sm:w-auto px-8 py-3 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 active:translate-y-0.5 flex items-center justify-center"
                                    >
                                        {isMarking ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-t-2 border-gray-200 border-t-transparent rounded-full animate-spin mr-3"></span>
                                                Marking...
                                            </>
                                        ) : (
                                            "Mark My Attendance"
                                        )}
                                    </button>
                                ) : (
                                     <button
                                        onClick={handleLinkFace}
                                        disabled={!stream || isLinking}
                                        className="w-full sm:w-auto px-8 py-3 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 active:translate-y-0.5 flex items-center justify-center"
                                    >
                                        {isLinking ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-t-2 border-gray-200 border-t-transparent rounded-full animate-spin mr-3"></span>
                                                Linking...
                                            </>
                                        ) : (
                                            "Link My Face"
                                        )}
                                    </button>
                                )}

                            </div>
                        )}

                        {error && (
                            <div className="text-center rounded-lg p-3 animate-fade-in text-yellow-300 bg-yellow-900/50 border border-yellow-700">
                                <p className="font-bold">{error.title}</p>

                                <p className="text-sm">{error.message}</p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                         <h3 className="text-lg font-bold text-gray-200 mb-3">Your Attendance Log</h3>
                         <div className="bg-slate-900/50 rounded-lg max-h-[60vh] overflow-y-auto">
                            {studentAttendance.length === 0 ? (
                                <p className="text-center text-gray-500 p-8">No attendance records found.</p>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                                        <tr>
                                            <th className="p-3 text-sm font-semibold text-gray-400">Date</th>
                                            <th className="p-3 text-sm font-semibold text-gray-400">Time</th>
                                            <th className="p-3 text-sm font-semibold text-gray-400">Emotion</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {studentAttendance.map(record => {
                                            const date = new Date(record.timestamp);
                                            return (
                                                <tr key={record.timestamp} className="hover:bg-slate-800/60">
                                                    <td className="p-3 text-sm text-gray-300">{date.toLocaleDateString()}</td>
                                                    <td className="p-3 text-sm text-gray-300">{date.toLocaleTimeString()}</td>
                                                    <td className="p-3 text-sm text-gray-300 flex items-center gap-2">
                                                        <span>{emotionUIConfig[record.emotion].emoji}</span>
                                                        <span>{record.emotion}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                         </div>
                    </div>
                </div>
            </main>
        </div>
    );
};