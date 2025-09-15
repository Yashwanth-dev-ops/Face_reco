

import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon } from './CameraIcon';

interface AttendanceCaptureModalProps {
    onClose: () => void;
    onCapture: (base64Data: string) => Promise<void>;
    title: string;
    actionText: string;
}

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center backdrop-blur-sm z-20">
        <div className="w-12 h-12 border-4 border-t-4 border-gray-200 border-t-indigo-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg font-semibold text-white">Processing...</p>
    </div>
);

export const AttendanceCaptureModal: React.FC<AttendanceCaptureModalProps> = ({ onClose, onCapture, title, actionText }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let mediaStream: MediaStream | null = null;
        const startCamera = async () => {
            setError(null);
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setError("Camera not supported on this browser.");
                    return;
                }

                if (navigator.permissions && navigator.permissions.query) {
                    const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    if (permission.state === 'denied') {
                        setError("Camera access is blocked. Please go to your browser settings to allow camera access for this site.");
                        return;
                    }
                }

                mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Camera error:", err);
                if (err instanceof DOMException && err.name === 'NotAllowedError') {
                     setError("You denied camera access. Please allow access to mark attendance.");
                } else {
                     setError("Could not start camera. It may be in use by another app.");
                }
            }
        };

        startCamera();

        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || isProcessing) return;

        setError(null);
        setIsProcessing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
            setError("Failed to get canvas context.");
            setIsProcessing(false);
            return;
        }
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const base64Data = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

        try {
            await onCapture(base64Data);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsProcessing(false); // Stay in modal to show error
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-lg m-4" onClick={(e) => e.stopPropagation()}>
                {isProcessing && <LoadingSpinner />}
                <h2 className="text-2xl font-bold text-white text-center">{title}</h2>
                <div className="mt-6 w-full aspect-[4/3] bg-slate-900 rounded-lg overflow-hidden relative border-2 border-slate-700 shadow-lg">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3/4 h-3/4 border-4 border-white/20 rounded-full border-dashed animate-pulse-slow"></div>
                    </div>
                </div>

                {error && <p className="text-sm text-red-400 text-center mt-4 h-5">{error || ' '}</p>}
                
                <div className="mt-6 flex justify-center items-center gap-4">
                     <button type="button" onClick={onClose} disabled={isProcessing} className="px-6 py-2 rounded-md text-gray-300 hover:underline disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleCapture} disabled={isProcessing || !stream} className="px-6 py-3 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 active:translate-y-0.5 flex items-center justify-center shadow-lg disabled:opacity-50">
                        <CameraIcon className="w-5 h-5 mr-2" />
                        {actionText}
                    </button>
                </div>
            </div>
        </div>
    );
};