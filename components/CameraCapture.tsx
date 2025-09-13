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

    const startCamera = async () => {
        setError(null);
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width, height },
                    audio: false
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } else {
                setError("Your browser does not support camera access.");
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please check permissions.");
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
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL(photoFormat, photoQuality);
            onPhotoCaptured(dataUrl);
            stopCamera();
        }
    };
    
    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 text-center">Profile Photo</label>
            <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden relative border-2 border-slate-700">
                {photo ? (
                    <img src={photo} alt="Captured profile" className="w-full h-full object-cover" />
                ) : (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"></video>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
                {error && <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/50 text-red-400 text-center text-sm">{error}</div>}
            </div>
            <div className="flex justify-center mt-3">
                {photo ? (
                    <button type="button" onClick={onRetake} className="px-4 py-2 rounded-md font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all duration-150 ease-in-out active:translate-y-0.5 shadow-lg">Retake Photo</button>
                ) : (
                    <button type="button" onClick={handleCapture} disabled={!stream} className="px-4 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-150 ease-in-out active:translate-y-0.5 shadow-lg flex items-center gap-2 disabled:opacity-50">
                        <CameraIcon className="w-5 h-5"/> Capture Photo
                    </button>
                )}
            </div>
        </div>
    );
};
