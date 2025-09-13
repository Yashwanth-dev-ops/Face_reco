


import React, { useState, useRef, useCallback, useEffect } from 'react';
import { detectFacesAndHands } from './services/geminiService';
import { exportAttendanceToCSV } from './services/csvExportService';
import * as apiService from './services/apiService';
import { DetectionResult, FaceResult, BoundingBox, StudentInfo, AdminInfo, AttendanceRecord, Emotion, Year, Designation } from './types';
import { CameraIcon } from './components/CameraIcon';
import { DetectionOverlay } from './components/DetectionOverlay';
import { WelcomeScreen } from './components/WelcomeScreen';
import { DetectionSummary } from './components/DetectionSummary';
import { RegistrationModal } from './components/RegistrationModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentRegistrationScreen } from './components/StudentRegistrationScreen';
import { AdminRegistrationScreen } from './components/AdminRegistrationScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';


type View = 'LOGIN' | 'STUDENT_REGISTRATION' | 'ADMIN_REGISTRATION' | 'ADMIN_DASHBOARD' | 'TEACHER_DASHBOARD' | 'STUDENT_DASHBOARD' | 'ANALYZER';
type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });

const calculateIoU = (boxA: BoundingBox, boxB: BoundingBox): number => {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);
    const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;
    if (boxAArea <= 0 || boxBArea <= 0) return 0;
    const unionArea = boxAArea + boxBArea - intersectionArea;
    const iou = intersectionArea / unionArea;
    return isNaN(iou) ? 0 : iou;
};


const App: React.FC = () => {
    // App state
    const [view, setView] = useState<View>('LOGIN');
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [detectionResult, setDetectionResult] = useState<DetectionResult>({ faces: [], hands: [] });
    const [error, setError] = useState<{title: string, message: string} | null>(null);
    const [isApiError, setIsApiError] = useState(false);
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
    const [isPausedForRateLimit, setIsPausedForRateLimit] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Data state
    const [studentDirectory, setStudentDirectory] = useState<Map<string, StudentInfo>>(new Map());
    const [adminDirectory, setAdminDirectory] = useState<Map<string, AdminInfo>>(new Map());
    const [faceLinks, setFaceLinks] = useState<Map<number, string>>(new Map());
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [registrationTarget, setRegistrationTarget] = useState<FaceResult | null>(null);
    const lastAttendanceLogRef = useRef<Map<number, number>>(new Map());

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isProcessing = useRef(false);
    const trackedFacesRef = useRef<Map<number, { boundingBox: BoundingBox; lastSeen: number; geminiId: string }>>(new Map());
    const nextFaceIdRef = useRef(1);
    
    // Constants
    const ANALYSIS_INTERVAL = 2000;
    const RATE_LIMIT_PAUSE_MS = 61000;
    const ATTENDANCE_LOG_INTERVAL_MS = 5 * 60 * 1000;

    // Load all data from API service on initial render
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [students, admins, links, attend, depts] = await Promise.all([
                    apiService.getStudentDirectory(),
                    apiService.getAdminDirectory(),
                    apiService.getFaceLinks(),
                    apiService.getAttendance(),
                    apiService.getDepartments(),
                ]);
                setStudentDirectory(students);
                setAdminDirectory(admins);
                setFaceLinks(links);
                setAttendance(attend);
                setDepartments(depts);
            } catch (err) {
                console.error("Failed to load initial data", err);
                setError({ title: "Loading Error", message: "Could not load application data." });
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleLogin = (user: CurrentUser) => {
        setCurrentUser(user);
        if (user.userType === 'ADMIN') {
            if (user.designation === Designation.Teacher) {
                setView('TEACHER_DASHBOARD');
            } else {
                setView('ADMIN_DASHBOARD');
            }
        } else {
            setView('STUDENT_DASHBOARD');
        }
    };
    
    const handleLogout = () => {
        handleStopCamera();
        setCurrentUser(null);
        setView('LOGIN');
    };
    
    const handleStudentRegister = async (student: StudentInfo) => {
        const newStudent = await apiService.registerStudent(student);
        setStudentDirectory(prev => new Map(prev).set(newStudent.rollNumber, newStudent));
        setView('LOGIN');
    };

    const handleAdminRegister = async (admin: AdminInfo) => {
        const { newAdmin, updatedDepartments } = await apiService.registerAdmin(admin);
        setAdminDirectory(prev => new Map(prev).set(newAdmin.idNumber, newAdmin));
        setDepartments(updatedDepartments);
        setView('LOGIN');
    };

    const handleStartCamera = async () => {
        setError(null);
        setIsPausedForRateLimit(false);
        setDetectionResult({ faces: [], hands: [] });
        trackedFacesRef.current.clear();

        try {
             if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError({ title: "Unsupported Browser", message: "Your browser does not support getUserMedia." });
                return;
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            let title = "Camera Error";
            let message = "An unexpected error occurred.";
            if (err instanceof DOMException) {
                if (err.name === 'NotAllowedError') {
                    title = "Camera Permission Denied";
                    message = "Please allow camera access in your browser settings.";
                } else if (err.name === 'NotFoundError') {
                    title = "No Camera Found";
                    message = "Please ensure a camera is connected.";
                } else if (err.name === 'NotReadableError') {
                    title = "Camera in Use";
                    message = "Your camera might be in use by another application.";
                }
            }
            setError({ title, message });
        }
    };

    const handleStopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setDetectionResult({ faces: [], hands: [] });
            setVideoDimensions({ width: 0, height: 0 });
            trackedFacesRef.current.clear();
            setIsPausedForRateLimit(false);
        }
    };
    
    const handleRegisterStudentFace = (face: FaceResult) => setRegistrationTarget(face);

    const handleLinkFaceToStudent = async (persistentId: number, rollNumber: string) => {
        const newLinks = await apiService.linkFaceToStudent(persistentId, rollNumber);
        setFaceLinks(newLinks);
        setRegistrationTarget(null);
    };
    
    const handleStudentSelfLinkFace = async (rollNumber: string) => {
        try {
            const newLinks = await apiService.linkNewFaceForStudent(rollNumber);
            setFaceLinks(newLinks);
        } catch (err) {
            console.error("Failed to link face:", err);
            throw err;
        }
    };
    
    const handleDeleteStudent = async (rollNumber: string) => {
        const { updatedStudents, updatedFaceLinks, updatedAttendance } = await apiService.deleteStudent(rollNumber);
        setStudentDirectory(updatedStudents);
        setFaceLinks(updatedFaceLinks);
        setAttendance(updatedAttendance);
    };
    
    const handleToggleBlockStudent = async (rollNumber: string) => {
        const updatedStudent = await apiService.toggleStudentBlock(rollNumber);
        setStudentDirectory(prev => new Map(prev).set(rollNumber, updatedStudent));
    };
    
    const handleDeleteAdmin = async (idNumber: string) => {
        try {
            const updatedAdmins = await apiService.deleteAdmin(idNumber);
            setAdminDirectory(updatedAdmins);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleToggleBlockAdmin = async (idNumber: string) => {
        try {
            const updatedAdmin = await apiService.toggleAdminBlock(idNumber);
            setAdminDirectory(prev => new Map(prev).set(idNumber, updatedAdmin));
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleAddDepartment = async (name: string) => {
        if (name && !departments.includes(name)) {
            const newDepartments = await apiService.addDepartment(name);
            setDepartments(newDepartments);
        }
    };
    
    const handleDownload = (filteredAttendance: AttendanceRecord[]) => exportAttendanceToCSV(filteredAttendance, faceLinks, studentDirectory);

    const handleLogAttendance = async (persistentId: number, emotion: Emotion) => {
        const newAttendance = await apiService.logAttendance(persistentId, emotion);
        setAttendance(newAttendance);
    };
    
    const captureAndAnalyze = useCallback(async () => {
        if (isProcessing.current || !videoRef.current || !canvasRef.current || !stream) return;

        isProcessing.current = true;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (video.videoWidth === 0 || !context) {
            isProcessing.current = false;
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
        try {
            const result = await detectFacesAndHands(base64Data);
            const newDetections = result.faces;
            const currentTime = Date.now();
            const matchedPairs: { trackId: number; detection: FaceResult; detectionIndex: number }[] = [];
            const usedDetectionIndices = new Set<number>();
            const IOU_THRESHOLD = 0.4;

            for (const [trackId, trackData] of trackedFacesRef.current.entries()) {
                let bestMatchIndex = -1;
                let bestIoU = 0;
                newDetections.forEach((detection, index) => {
                    if (usedDetectionIndices.has(index)) return;
                    const iou = calculateIoU(trackData.boundingBox, detection.boundingBox);
                    if (iou > bestIoU && iou > IOU_THRESHOLD) {
                        bestIoU = iou;
                        bestMatchIndex = index;
                    }
                });
                if (bestMatchIndex !== -1) {
                    matchedPairs.push({ trackId, detection: newDetections[bestMatchIndex], detectionIndex: bestMatchIndex });
                    usedDetectionIndices.add(bestMatchIndex);
                }
            }

            const newTrackedFaces = new Map<number, { boundingBox: BoundingBox; lastSeen: number; geminiId: string }>();
            
            for (const { trackId, detection } of matchedPairs) {
                newTrackedFaces.set(trackId, { boundingBox: detection.boundingBox, lastSeen: currentTime, geminiId: detection.personId });
                detection.persistentId = trackId;
            }

            const maxId = Array.from(trackedFacesRef.current.keys()).reduce((max, id) => Math.max(max, id), 0);
            nextFaceIdRef.current = maxId + 1;

            newDetections.forEach((detection, index) => {
                if (!usedDetectionIndices.has(index)) {
                    const newId = nextFaceIdRef.current++;
                    newTrackedFaces.set(newId, { boundingBox: detection.boundingBox, lastSeen: currentTime, geminiId: detection.personId });
                    detection.persistentId = newId;
                }
            });
            
            trackedFacesRef.current = newTrackedFaces;
            
            newDetections.forEach(face => {
                if (face.persistentId) {
                    const rollNumber = faceLinks.get(face.persistentId);
                    const studentInfo = rollNumber ? studentDirectory.get(rollNumber) : undefined;

                    if (studentInfo && !studentInfo.isBlocked) {
                        face.studentInfo = studentInfo;
                        const lastLog = lastAttendanceLogRef.current.get(face.persistentId);
                        if (!lastLog || currentTime - lastLog > ATTENDANCE_LOG_INTERVAL_MS) {
                           
                            apiService.logAttendance(face.persistentId, face.emotion).then(newAttendance => {
                                setAttendance(newAttendance);
                                lastAttendanceLogRef.current.set(face.persistentId!, currentTime);
                            });
                        }
                    }
                }
            });

            setDetectionResult({ ...result, faces: newDetections });
            if (isApiError) { setError(null); setIsApiError(false); }
        } catch (apiError) {
            console.error("API Error:", apiError);
            if (apiError instanceof Error) {
                if (apiError.message === "RATE_LIMIT") {
                    setError({ title: "API Rate Limit Exceeded", message: `Analysis paused. Resuming in ${RATE_LIMIT_PAUSE_MS / 1000}s.` });
                    setIsApiError(true);
                    setIsPausedForRateLimit(true);
                    setTimeout(() => {
                        if (videoRef.current?.srcObject) {
                            setIsPausedForRateLimit(false);
                            setError(null);
                            setIsApiError(false);
                        } else {
                            setIsPausedForRateLimit(false);
                        }
                    }, RATE_LIMIT_PAUSE_MS);
                } else if (apiError.message === "NETWORK_ERROR") {
                    setError({ title: "Network Connection Issue", message: "Cannot connect to the AI service. Please check your internet connection." });
                    setIsApiError(true);
                } else {
                    setError({ title: "Analysis Failed", message: "Could not analyze the frame. Retrying..." });
                    setIsApiError(true);
                }
            } else {
                setError({ title: "Unknown Error", message: "An unexpected problem occurred during analysis." });
                setIsApiError(true);
            }
            setDetectionResult({ faces: [], hands: [] });
        }
        isProcessing.current = false;
    }, [stream, isApiError, studentDirectory, faceLinks]);

    useEffect(() => {
        if (isPausedForRateLimit) return;
        let intervalId: number | null = null;
        if (stream) {
            captureAndAnalyze();
            intervalId = window.setInterval(captureAndAnalyze, ANALYSIS_INTERVAL);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [stream, captureAndAnalyze, isPausedForRateLimit]);

    const handleVideoMetadata = () => {
        if (videoRef.current) setVideoDimensions({ width: videoRef.current.clientWidth, height: videoRef.current.clientHeight });
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-300">Loading University Data...</p>
                </div>
            );
        }

        switch(view) {
            case 'LOGIN':
                return <LoginScreen onLogin={handleLogin} onNavigateToRegister={(type) => setView(type === 'STUDENT' ? 'STUDENT_REGISTRATION' : 'ADMIN_REGISTRATION')} />;
            case 'STUDENT_REGISTRATION':
                return <StudentRegistrationScreen departments={departments} onRegister={handleStudentRegister} onBackToLogin={() => setView('LOGIN')} />;
            case 'ADMIN_REGISTRATION':
                return <AdminRegistrationScreen departments={departments} onRegister={handleAdminRegister} onBackToLogin={() => setView('LOGIN')} />;
            case 'ADMIN_DASHBOARD':
                if (currentUser?.userType === 'ADMIN') {
                     return <AdminDashboard 
                                currentUser={currentUser}
                                studentDirectory={studentDirectory} 
                                adminDirectory={adminDirectory}
                                departments={departments}
                                attendance={attendance}
                                faceLinks={faceLinks}
                                onDeleteStudent={handleDeleteStudent}
                                onToggleBlockStudent={handleToggleBlockStudent}
                                onDeleteAdmin={handleDeleteAdmin}
                                onToggleBlockAdmin={handleToggleBlockAdmin}
                                onLogout={handleLogout}
                                onDownload={handleDownload}
                            />;
                }
                handleLogout();
                return null;
            case 'TEACHER_DASHBOARD':
                if (currentUser?.userType === 'ADMIN' && currentUser.designation === Designation.Teacher) {
                    return <TeacherDashboard
                        currentUser={currentUser}
                        studentDirectory={studentDirectory}
                        attendance={attendance}
                        faceLinks={faceLinks}
                        onLogout={handleLogout}
                        onDownload={handleDownload}
                    />;
                }
                handleLogout();
                return null;
            case 'STUDENT_DASHBOARD':
                if (currentUser?.userType === 'STUDENT') {
                    // FIX: Removed unused `studentDirectory` prop, which is not defined in `StudentDashboardProps`, to resolve a type error.
                    return <StudentDashboard
                        currentUser={currentUser}
                        attendance={attendance}
                        faceLinks={faceLinks}
                        onLogout={handleLogout}
                        onLogAttendance={handleLogAttendance}
                        onLinkFace={() => handleStudentSelfLinkFace(currentUser.rollNumber)}
                    />;
                }
                handleLogout();
                return null;
            case 'ANALYZER':
                 const unlinkedStudents = Array.from(studentDirectory.values()).filter(s => {
                    return !Array.from(faceLinks.values()).includes(s.rollNumber);
                });
                const linkedStudentCount = faceLinks.size;

                return (
                     <div className="w-full max-w-7xl mx-auto flex flex-col">
                        {registrationTarget && (
                            <RegistrationModal 
                                face={registrationTarget}
                                unlinkedStudents={unlinkedStudents}
                                onClose={() => setRegistrationTarget(null)}
                                onLink={handleLinkFaceToStudent}
                            />
                        )}
                        <header className="mb-6 w-full flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-12 h-12 rounded-full" />
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-gray-200">Krishna University</h1>
                                    <p className="text-sm text-gray-400">Face Attendance</p>
                                </div>
                            </div>
                            <button onClick={() => setView(currentUser?.userType === 'ADMIN' && currentUser.designation === Designation.Teacher ? 'TEACHER_DASHBOARD' : 'ADMIN_DASHBOARD')} className="px-4 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 active:translate-y-0.5 shadow-lg">
                                &larr; Back to Dashboard
                            </button>
                        </header>
                        
                        <main className="w-full bg-slate-800/40 rounded-2xl shadow-2xl p-4 md:p-6 border border-slate-800 backdrop-blur-sm">
                            <div className="text-center mb-6">
                                <h2 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300">
                                    Live Attendance Analyzer
                                </h2>
                                <p className="text-gray-400 mt-1">Real-time attendance marking using facial recognition.</p>
                            </div>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className={`relative w-full flex-grow aspect-video bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-800 shadow-inner transition-shadow duration-500 ${stream ? 'shadow-lg shadow-indigo-500/40' : ''}`}>
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" onLoadedMetadata={handleVideoMetadata} />
                                    <canvas ref={canvasRef} className="hidden" />
                                    {!stream && <WelcomeScreen />}
                                    {stream && videoDimensions.width > 0 && <DetectionOverlay result={detectionResult} videoWidth={videoDimensions.width} videoHeight={videoDimensions.height} onRegister={handleRegisterStudentFace} />}
                                </div>
                                <DetectionSummary result={detectionResult} studentCount={linkedStudentCount} />
                            </div>
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={stream ? handleStopCamera : handleStartCamera}
                                    className={`w-full sm:w-auto px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 flex items-center justify-center shadow-lg transform hover:scale-105 active:translate-y-0.5 ${
                                        stream
                                            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:ring-red-500 text-white'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-indigo-500 text-white'
                                    }`}
                                >
                                <CameraIcon className="w-6 h-6 mr-3" />
                                {stream ? (
                                        <div className="flex items-center gap-2">
                                            <span>Stop Camera</span>
                                            <span className="flex h-3 w-3 relative ml-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                                        </div>
                                ) : 'Start Camera'}
                                </button>
                            </div>
                            {error && (
                                <div className={`mt-4 text-center rounded-lg p-3 animate-fade-in ${isApiError ? 'text-yellow-300 bg-yellow-900/50 border border-yellow-700' : 'text-red-300 bg-red-900/50 border border-red-700'}`}>
                                    <p className="font-bold">{error.title}</p>
                                    <p className="text-sm">{error.message}</p>
                                </div>
                            )}
                        </main>
                    </div>
                );
            default:
                return <LoginScreen onLogin={handleLogin} onNavigateToRegister={(type) => setView(type === 'STUDENT' ? 'STUDENT_REGISTRATION' : 'ADMIN_REGISTRATION')} />;
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
            {renderContent()}
        </div>
    );
};

export default App;