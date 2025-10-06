import React, { useState, useRef, useEffect } from 'react';
import * as apiService from '../services/apiService';
import * as geminiService from '../services/geminiService';
import { AdminInfo, StudentInfo } from '../types';
import { CameraIcon } from './CameraIcon';

type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });

interface FaceLoginProps {
    onLoginSuccess: (user: CurrentUser) => void;
    onCancel: () => void;
    onFailure: (errorMessage: string) => void;
}

type Status = 'INITIALIZING' | 'READY' | 'VERIFYING';

const FaceLoginSpinner: React.FC<{text: string}> = ({ text }) => (
    <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center text-center backdrop-blur-sm z-20 rounded-2xl">
        <div className="w-12 h-12 border-4 border-t-4 border-gray-200 border-t-blue-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg font-semibold text-white">{text}</p>
    </div>
);


export const FaceLogin: React.FC<FaceLoginProps> = ({ onLoginSuccess, onCancel, onFailure }) => {
    const [status, setStatus] = useState<Status>('INITIALIZING');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let mediaStream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Camera not supported on this browser.");
                }

                if (navigator.permissions && navigator.permissions.query) {
                    const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    if (permission.state === 'denied') {
                        throw new Error("Camera access is blocked. Please go to your browser settings to allow camera access for this site.");
                    }
                }

                mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300, facingMode: 'user' } });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                setStatus('READY');
            } catch (err) {
                console.error("Camera error:", err);
                const message = (err instanceof Error) ? err.message : "Could not start camera. It may be in use by another app.";
                onFailure(message);
            }
        };
        startCamera();
        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [onFailure]);
    
    const verifyFace = async (imageBase64: string) => {
        try {
            const userProfiles = await apiService.getAllUsersWithPhotos();
            if (userProfiles.length === 0) throw new Error("No users with profile photos are registered.");

            const { matchedUserId, confidence } = await geminiService.recognizeFace(imageBase64, userProfiles);
            const confidenceThreshold = parseFloat(process.env.FACE_RECOGNITION_CONFIDENCE_THRESHOLD || '0.75');

            if (matchedUserId !== 'UNKNOWN' && confidence > confidenceThreshold) {
                const user = await apiService.getUserById(matchedUserId);
                if (user) {
                    if ((user as any).isBlocked) {
                        throw new Error(`Login failed: Account for ${user.name} is blocked.`);
                    }
                    onLoginSuccess(user);
                } else {
                    throw new Error("Match found but user data could not be retrieved.");
                }
            } else {
                throw new Error("Face not recognized. Please try again in a well-lit area.");
            }

        } catch(err) {
            let errorMessage = "An unknown error occurred during verification.";
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            onFailure(errorMessage);
        }
    };

    const handleCaptureAndVerify = async () => {
        if (status !== 'READY' || !videoRef.current || !canvasRef.current) return;

        setStatus('VERIFYING');

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context || video.videoWidth === 0) {
            onFailure("Could not capture video frame.");
            return;
        }
        context.translate(video.videoWidth, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const capturedImageBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        
        await verifyFace(capturedImageBase64);
    };

    return (
        <div className="w-full text-center animate-fade-in relative">
            {status === 'VERIFYING' && <FaceLoginSpinner text="Verifying Identity..." />}
             <div className={`${status === 'VERIFYING' ? 'opacity-50' : 'opacity-100'}`}>
                <h3 className="text-2xl font-bold text-white mb-4">Face ID Login</h3>
                
                <div className="w-full max-w-xs mx-auto aspect-video bg-gray-900 rounded-lg overflow-hidden relative border border-gray-700 shadow-lg">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3/4 aspect-square rounded-full border-4 border-white/20 border-dashed animate-pulse-slow"></div>
                    </div>

                     {status === 'INITIALIZING' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                            Starting camera...
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-400 text-center mt-4 h-5">
                    Position your face in the oval and press the button.
                </p>

                <div className="mt-6 space-y-3">
                    <button
                        onClick={handleCaptureAndVerify}
                        disabled={status !== 'READY' || !stream}
                        className="w-full max-w-xs mx-auto px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 flex items-center justify-center shadow-lg disabled:opacity-50"
                    >
                        <CameraIcon className="w-5 h-5 mr-2" />
                        Scan Face for Login
                    </button>
                    <button onClick={onCancel} className="w-full max-w-xs mx-auto text-sm text-gray-400 hover:text-white hover:underline">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};