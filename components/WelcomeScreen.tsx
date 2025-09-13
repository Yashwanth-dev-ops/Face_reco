import React from 'react';

export const WelcomeScreen: React.FC = () => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 bg-opacity-80 backdrop-blur-sm p-4 text-center">
            <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-24 h-24 mb-4 rounded-full shadow-lg" />
            <h2 className="text-2xl font-bold text-white">Krishna University</h2>
            <p className="text-lg text-gray-300 mt-1">Face Attendance System</p>
            <p className="text-gray-400 mt-4 max-w-md">
                Click 'Start Camera' to begin continuous, real-time analysis of the video feed.
            </p>
            <div className="mt-6 space-y-2 text-gray-300">
                <p><span className="font-semibold text-indigo-300">Tracks:</span> Attendance via Person ID</p>
                <p><span className="font-semibold text-indigo-300">Detects:</span> Multiple Faces & Hand Signs</p>
                <p><span className="font-semibold text-indigo-300">Analyzes:</span> Emotions & Gestures</p>
            </div>
        </div>
    );
};