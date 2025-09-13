import React, { useState, useRef, useEffect } from 'react';
import * as apiService from '../services/apiService';
import * as geminiService from '../services/geminiService';
import { AdminInfo, StudentInfo, BoundingBox } from '../types';
import { CameraIcon } from './CameraIcon';

type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });

interface FaceLoginProps {
    onLogin: (user: CurrentUser) => void;
    onCancel: () => void;
}

type Status = 'IDLE' | 'SCANNING' | 'DETECTING' | 'VERIFYING';

interface DetectionBox extends BoundingBox {
  color: string;
}

const FaceLoginSpinner: React.FC<{text: string}> = ({ text }) => (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center backdrop-blur-sm z-20">
        <div className="w-12 h-12 border-4 border-t-4 border-gray-200 border-t-indigo-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg font-semibold text-white">{text}</p>
    </div>
);

export const FaceLogin: React.FC<FaceLoginProps> = ({ onLogin, onCancel }) => {
    const [status, setStatus] = useState<Status>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [detectionBox, setDetectionBox] = useState<DetectionBox | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mediaStream: MediaStream | null = null;
        const startCamera = async () => {
            setError(null);
            try {
                if (navigator.mediaDevices?.getUserMedia) {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                } else {
                    setError("Camera not supported on this browser.");
                }
            } catch (err) {
                setError("Camera permission denied. Please enable camera access.");
                console.error(err);
            }
        };
        startCamera();
        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const resetState = (delay = 0) => {
        setTimeout(() => {
            setStatus('IDLE');
            setError(null);
            setDetectionBox(null);
        }, delay);
    };

    const handleLogin = async () => {
        if (!videoRef.current || !canvasRef.current || status !== 'IDLE') return;
        
        setStatus('SCANNING');
        setError(null);
        setDetectionBox(null);

        setTimeout(async () => {
            if (!videoRef.current || !canvasRef.current) {
                resetState();
                return;
            }

            setStatus('DETECTING');

            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const capturedImageBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

            try {
                const detectionResult = await geminiService.detectFacesAndHands(capturedImageBase64);
                if (detectionResult.faces.length === 0) {
                    throw new Error("No face detected. Please ensure you are clearly visible.");
                }

                const face = detectionResult.faces[0];
                const box = face.boundingBox;
                // Check if the face is large enough, but not necessarily centered.
                const isGoodQuality = box.width > 0.25 && box.height > 0.25;

                if (!isGoodQuality) {
                    setDetectionBox({ ...box, color: 'border-yellow-400' });
                    throw new Error("Please move closer to the camera.");
                }
                
                setDetectionBox({ ...box, color: 'border-green-400' });

                await new Promise(resolve => setTimeout(resolve, 500)); // Show green box briefly
                
                setStatus('VERIFYING');

                const userProfiles = await apiService.getAllUsersWithPhotos();
                if (userProfiles.length === 0) throw new Error("No users with profile photos are registered.");

                const { matchedUserId, confidence } = await geminiService.recognizeFace(capturedImageBase64, userProfiles);
                const confidenceThreshold = parseFloat(process.env.FACE_RECOGNITION_CONFIDENCE_THRESHOLD || '0.75');

                if (matchedUserId !== 'UNKNOWN' && confidence > confidenceThreshold) {
                    const user = await apiService.getUserById(matchedUserId);
                    if (user) {
                        if (user.userType === 'STUDENT' && user.isBlocked) throw new Error(`Login failed: Account for ${user.name} is blocked.`);
                        onLogin(user);
                    } else {
                        throw new Error("Match found but user data could not be retrieved.");
                    }
                } else {
                    throw new Error("Face not recognized. Please try again in a well-lit area.");
                }
            } catch (err) {
                let errorMessage = "An unknown error occurred.";
                if (err instanceof Error) {
                    if (err.message === "RATE_LIMIT") {
                        errorMessage = "You are trying too frequently. Please wait a moment before trying again.";
                    } else {
                        errorMessage = err.message;
                    }
                }
                setError(errorMessage);
                resetState(3000);
            }
        }, 1500); // Wait for scanner animation
    };
    
    const getSpinnertext = () => {
        if (status === 'DETECTING') return 'Detecting Face...';
        if (status === 'VERIFYING') return 'Verifying Identity...';
        return '';
    };

    const isProcessing = status === 'SCANNING' || status === 'DETECTING' || status === 'VERIFYING';

    return (
        <div className="w-full text-center animate-fade-in relative">
            {(status === 'DETECTING' || status === 'VERIFYING') && <FaceLoginSpinner text={getSpinnertext()} />}
            <div className={`${(status === 'DETECTING' || status === 'VERIFYING') ? 'opacity-50' : 'opacity-100'}`}>
                <h3 className="text-xl font-semibold text-white mb-4">Face ID Login</h3>
                
                <div ref={containerRef} className="w-full max-w-xs mx-auto aspect-video bg-slate-900 rounded-lg overflow-hidden relative border-2 border-slate-700 shadow-lg">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute inset-0 border-4 border-white/10 rounded-lg pointer-events-none animate-pulse-slow"></div>
                    
                    {status === 'SCANNING' && (
                       <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_2px_rgba(0,255,255,0.7)] animate-scanner"></div>
                    )}
                    
                    {detectionBox && containerRef.current && (
                         <div style={{
                            position: 'absolute',
                            left: `${detectionBox.x * containerRef.current.clientWidth}px`,
                            top: `${detectionBox.y * containerRef.current.clientHeight}px`,
                            width: `${detectionBox.width * containerRef.current.clientWidth}px`,
                            height: `${detectionBox.height * containerRef.current.clientHeight}px`,
                        }} className={`border-4 ${detectionBox.color} rounded-md transition-all duration-300 shadow-lg`}></div>
                    )}
                </div>

                <p className="text-sm text-red-400 text-center mt-4 h-5">{error || ' '}</p>

                <div className="mt-2 space-y-3">
                    <button onClick={handleLogin} disabled={isProcessing || !stream} className="w-full max-w-xs mx-auto px-6 py-3 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 active:translate-y-0.5 flex items-center justify-center shadow-lg disabled:opacity-50">
                        <CameraIcon className="w-5 h-5 mr-2" />
                        Scan Face & Login
                    </button>

                    <button onClick={onCancel} disabled={isProcessing} className="w-full max-w-xs mx-auto text-sm text-gray-400 hover:text-white hover:underline disabled:opacity-50">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};