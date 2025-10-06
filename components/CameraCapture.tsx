import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon } from './CameraIcon';

interface CameraCaptureProps {
    onPhotoCaptured: (base64Data: string) => void;
    onRetake: () => void;
    photo: string | null;
    width?: number;
    height?: number;
    photoFormat?: 'image/jpeg' | 'image/png';
    photoQuality?: number;
}

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);


export const CameraCapture: React.FC<CameraCaptureProps> = ({
    onPhotoCaptured,
    onRetake,
    photo,
    width = 400,
    height = 300,
    photoFormat = 'image/jpeg',
    photoQuality = 0.9,
}) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = async () => {
        setError(null);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("Your browser does not support camera access.");
                return;
            }

            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
                if (permission.state === 'denied') {
                    setError("Camera access is blocked. Please go to your browser settings to allow camera access for this site.");
                    return;
                }
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width, height },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError("You denied camera access. Please allow camera access in your browser settings to continue.");
            } else {
                setError("Could not access camera. It might be in use by another application.");
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };
    
    useEffect(() => {
        if (!photo) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [photo]);

    const handleCapture = () => {
        setError(null);
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            // Flip the context horizontally before drawing to un-mirror the final image
            if (context) {
                context.translate(video.videoWidth, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL(photoFormat, photoQuality);
                onPhotoCaptured(dataUrl);
                stopCamera();
            }
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError("Please select a valid image file (PNG, JPG).");
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                if (loadEvent.target?.result) {
                    onPhotoCaptured(loadEvent.target.result as string);
                } else {
                    setError("Could not read the selected file.");
                }
            };
            reader.onerror = () => {
                 setError("Error reading the selected file.");
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="pt-2">
            <label className="block text-sm font-medium text-gray-300 mb-2 text-center">Profile Photo</label>
            <div className="w-64 mx-auto aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden relative border border-gray-700">
                {photo ? (
                    <img src={photo} alt="Captured profile" className="w-full h-full object-cover" />
                ) : (
                    <>
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                        {error && <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/70 text-red-400 text-center text-sm">{error}</div>}
                    </>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/png"
                className="hidden"
            />
            
            <div className="flex justify-center mt-4">
                {photo ? (
                    <button type="button" onClick={onRetake} className="px-6 py-2 rounded-lg font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-rose-500 shadow-lg">Retake Photo</button>
                ) : (
                    <div className="flex items-center gap-4">
                         <button type="button" onClick={handleCapture} disabled={!stream} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                            <CameraIcon className="w-5 h-5"/> Capture
                        </button>
                        <span className="text-gray-500 text-sm">or</span>
                        <button type="button" onClick={handleUploadClick} className="px-4 py-2 rounded-lg font-semibold text-blue-300 bg-gray-700 hover:bg-gray-600 transition-all shadow-lg flex items-center gap-2">
                            <UploadIcon className="w-5 h-5"/> Upload File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};