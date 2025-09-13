
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { detectFacesAndHands } from './services/geminiService';
import { exportAttendanceToCSV } from './services/csvExportService';
import { loadStudents, saveStudents, loadAttendance, saveAttendance } from './services/storageService';
import { DetectionResult, FaceResult, BoundingBox, StudentInfo, AttendanceRecord, Emotion } from './types';
import { CameraIcon } from './components/CameraIcon';
import { DetectionOverlay } from './components/DetectionOverlay';
import { WelcomeScreen } from './components/WelcomeScreen';
import { DetectionSummary } from './components/DetectionSummary';
import { RegistrationModal } from './components/RegistrationModal';

// Helper function to calculate Intersection over Union (IoU)
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
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [detectionResult, setDetectionResult] = useState<DetectionResult>({ faces: [], hands: [] });
    const [error, setError] = useState<{title: string, message: string} | null>(null);
    const [isApiError, setIsApiError] = useState(false);
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
    const [isPausedForRateLimit, setIsPausedForRateLimit] = useState(false);

    // New state for registration and attendance
    const [students, setStudents] = useState<Map<number, StudentInfo>>(new Map());
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [registrationTarget, setRegistrationTarget] = useState<FaceResult | null>(null);
    const lastAttendanceLogRef = useRef<Map<number, number>>(new Map());

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isProcessing = useRef(false);
    const trackedFacesRef = useRef<Map<number, { boundingBox: BoundingBox; lastSeen: number; geminiId: string }>>(new Map());
    const nextFaceIdRef = useRef(1);
    
    const ANALYSIS_INTERVAL = 30000; // Increased to 30 seconds
    const RATE_LIMIT_PAUSE_MS = 61000; // Pause for just over a minute
    const ATTENDANCE_LOG_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    // Load data from localStorage on initial render
    useEffect(() => {
        setStudents(loadStudents());
        setAttendance(loadAttendance());
    }, []);

    // Save data to localStorage when it changes
    useEffect(() => {
        saveStudents(students);
    }, [students]);

    useEffect(() => {
        saveAttendance(attendance);
    }, [attendance]);


    const handleStartCamera = async () => {
        setError(null);
        setIsPausedForRateLimit(false);
        setDetectionResult({ faces: [], hands: [] });
        trackedFacesRef.current.clear();
        nextFaceIdRef.current = 1;

        try {
             if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError({
                    title: "Unsupported Browser",
                    message: "Your browser does not support the necessary features (getUserMedia). Please try a modern browser like Chrome or Firefox."
                });
                return;
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            if (err instanceof DOMException) {
                switch (err.name) {
                    case 'NotAllowedError':
                        setError({
                            title: "Camera Permission Denied",
                            message: "Please allow camera access in your browser settings and refresh the page to use this feature."
                        });
                        break;
                    case 'NotFoundError':
                        setError({
                            title: "No Camera Found",
                            message: "We couldn't find a camera connected to your device. Please ensure it is properly connected."
                        });
                        break;
                     case 'NotReadableError':
                        setError({
                            title: "Camera in Use",
                            message: "Your camera might be in use by another application. Please close other apps and try again."
                        });
                        break;
                    default:
                         setError({
                            title: "Camera Error",
                            message: "An unexpected error occurred while accessing the camera. Please check your device and browser settings."
                        });
                }
            } else {
                 setError({
                    title: "Could Not Access Camera",
                    message: "An unknown error occurred. Please ensure your camera is not in use by another application and that you have granted permissions."
                });
            }
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
    
    const handleRegisterStudent = (face: FaceResult) => {
        setRegistrationTarget(face);
    };

    const handleSaveStudent = (persistentId: number, info: StudentInfo) => {
        setStudents(prev => new Map(prev).set(persistentId, info));
        setRegistrationTarget(null);
    };
    
    const handleDownload = () => {
        exportAttendanceToCSV(attendance, students);
    };

    const captureAndAnalyze = useCallback(async () => {
        if (isProcessing.current || !videoRef.current || !canvasRef.current || !stream) {
            return;
        }

        isProcessing.current = true;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            isProcessing.current = false;
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = imageData.split(',')[1];
            
            try {
                const result = await detectFacesAndHands(base64Data);

                // --- Face Tracking Logic ---
                const newDetections = result.faces;
                const IOU_THRESHOLD = 0.4;
                const MAX_INACTIVITY_MS = 20000;
                const currentTime = Date.now();

                const matchedPairs: { trackId: number; detection: FaceResult; detectionIndex: number }[] = [];
                const usedDetectionIndices = new Set<number>();

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
                    newTrackedFaces.set(trackId, {
                        boundingBox: detection.boundingBox, lastSeen: currentTime, geminiId: detection.personId
                    });
                    detection.persistentId = trackId;
                }

                newDetections.forEach((detection, index) => {
                    if (!usedDetectionIndices.has(index)) {
                        const newId = nextFaceIdRef.current++;
                        newTrackedFaces.set(newId, {
                            boundingBox: detection.boundingBox, lastSeen: currentTime, geminiId: detection.personId
                        });
                        detection.persistentId = newId;
                    }
                });
                
                for (const [trackId, trackData] of trackedFacesRef.current.entries()) {
                     if (currentTime - trackData.lastSeen <= MAX_INACTIVITY_MS && !newTrackedFaces.has(trackId)) {
                        newTrackedFaces.set(trackId, trackData);
                    }
                }

                trackedFacesRef.current = newTrackedFaces;
                
                // --- Attendance and Registration Logic ---
                newDetections.forEach(face => {
                    if (face.persistentId) {
                        const studentInfo = students.get(face.persistentId);
                        if (studentInfo) {
                            face.studentInfo = studentInfo;
                            
                            // Log attendance if interval has passed
                            const lastLog = lastAttendanceLogRef.current.get(face.persistentId);
                            if (!lastLog || currentTime - lastLog > ATTENDANCE_LOG_INTERVAL_MS) {
                                setAttendance(prev => [...prev, {
                                    persistentId: face.persistentId!,
                                    timestamp: currentTime,
                                    emotion: face.emotion,
                                }]);
                                lastAttendanceLogRef.current.set(face.persistentId, currentTime);
                            }
                        }
                    }
                });

                setDetectionResult({ ...result, faces: newDetections });

                 if (isApiError) {
                    setError(null);
                    setIsApiError(false);
                }
            } catch (apiError) {
                console.error("API Error:", apiError);

                if (apiError instanceof Error && apiError.message === "RATE_LIMIT") {
                    setError({
                        title: "API Rate Limit Exceeded",
                        message: `Too many requests. Analysis is paused and will resume automatically in ${RATE_LIMIT_PAUSE_MS / 1000} seconds.`
                    });
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
                } else {
                    setError({
                        title: "Analysis Failed",
                        message: "Could not analyze the frame. Retrying automatically..."
                    });
                    setIsApiError(true);
                }
                setDetectionResult({ faces: [], hands: [] });
            }
        }
        
        isProcessing.current = false;
    }, [stream, isApiError, students]);

    useEffect(() => {
        if (isPausedForRateLimit) {
            return;
        }

        let intervalId: number | null = null;
        if (stream) {
            captureAndAnalyze();
            intervalId = window.setInterval(captureAndAnalyze, ANALYSIS_INTERVAL);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [stream, captureAndAnalyze, isPausedForRateLimit]);


    const handleVideoMetadata = () => {
        if (videoRef.current) {
            setVideoDimensions({
                width: videoRef.current.clientWidth,
                height: videoRef.current.clientHeight
            });
        }
    };


    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
            {registrationTarget && (
                <RegistrationModal 
                    face={registrationTarget}
                    onClose={() => setRegistrationTarget(null)}
                    onSave={handleSaveStudent}
                />
            )}
            <div className="w-full max-w-7xl mx-auto flex flex-col">
                <header className="mb-6 w-full">
                    <div className="flex items-center gap-3">
                        <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-12 h-12 rounded-full" />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-200">Krishna University</h1>
                            <p className="text-sm text-gray-400">Facial Emotion Recognition AI</p>
                        </div>
                    </div>
                </header>
                
                <main className="w-full bg-slate-800/40 rounded-2xl shadow-2xl p-4 md:p-6 border border-slate-800 backdrop-blur-sm">
                    <div className="text-center mb-6">
                         <h2 className="text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-300">
                            Vision AI Analyzer
                        </h2>
                        <p className="text-gray-400 mt-1">Live analysis of faces, emotions, gestures, and attendance.</p>
                        <p className="text-xs text-gray-500 mt-2">Analysis refreshes every 30 seconds to manage API usage.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className={`relative w-full flex-grow aspect-video bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-800 shadow-inner transition-shadow duration-500 ${stream ? 'shadow-lg shadow-indigo-500/40' : ''}`}>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover"
                                onLoadedMetadata={handleVideoMetadata}
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {!stream && <WelcomeScreen />}
                            
                            {stream && videoDimensions.width > 0 && (
                               <DetectionOverlay result={detectionResult} videoWidth={videoDimensions.width} videoHeight={videoDimensions.height} onRegister={handleRegisterStudent} />
                            )}
                        </div>
                        
                        <DetectionSummary result={detectionResult} studentCount={students.size} />
                    </div>
                    
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={stream ? handleStopCamera : handleStartCamera}
                            className={`w-full sm:w-auto px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 flex items-center justify-center shadow-lg transform hover:scale-105 ${
                                stream
                                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:ring-red-500 text-white'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-indigo-500 text-white'
                            }`}
                        >
                           <CameraIcon className="w-6 h-6 mr-3" />
                           {stream ? (
                                <div className="flex items-center gap-2">
                                    <span>Stop Camera</span>
                                    <span className="flex h-3 w-3 relative ml-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                </div>
                           ) : 'Start Camera'}
                        </button>
                        {attendance.length > 0 && (
                             <button
                                onClick={handleDownload}
                                className="w-full sm:w-auto px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 flex items-center justify-center shadow-lg transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:ring-green-500 text-white"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Attendance Log (CSV)
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className={`mt-4 text-center rounded-lg p-3 animate-fade-in ${isApiError ? 'text-yellow-300 bg-yellow-900/50 border border-yellow-700' : 'text-red-300 bg-red-900/50 border border-red-700'}`}>
                            <p className="font-bold">{error.title}</p>
                            <p className="text-sm">{error.message}</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
