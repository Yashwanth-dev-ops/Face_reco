import React, { useState, useEffect } from 'react';

type Status = 'PRESENT' | 'ABSENT' | 'BLOCKED' | 'UNLINKED';

interface AttendanceStatusPanelProps {
    status: Status;
    onMarkAttendanceClick: () => void;
    onLinkFaceClick: () => void;
    lastLogTime: Date | null;
    blockedByAdminName: string | null;
    blockExpiresAt: number | null;
}

// Icon components for different statuses
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const CalendarPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12v6m-3-3h6" />
    </svg>
);
const BlockedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
);
const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const formatTimeLeft = (ms: number): string => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const AttendanceStatusPanel: React.FC<AttendanceStatusPanelProps> = ({ status, onMarkAttendanceClick, onLinkFaceClick, lastLogTime, blockedByAdminName, blockExpiresAt }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (status === 'BLOCKED' && blockExpiresAt && blockExpiresAt !== Infinity) {
            const updateTimer = () => {
                const remaining = blockExpiresAt - Date.now();
                if (remaining > 0) {
                    setTimeLeft(formatTimeLeft(remaining));
                } else {
                    setTimeLeft("Expired. Please refresh.");
                    clearInterval(intervalId);
                }
            };
            
            updateTimer();
            const intervalId = setInterval(updateTimer, 1000);
            return () => clearInterval(intervalId);
        }
    }, [status, blockExpiresAt]);


    let config = {
        icon: <></>,
        title: '',
        message: '',
        button: null,
        bgColor: 'bg-gray-700/40',
        borderColor: 'border-gray-600/50',
        textColor: 'text-gray-300',
        extraContent: null as React.ReactNode,
    };

    switch (status) {
        case 'PRESENT':
            config = {
                ...config,
                icon: <CheckCircleIcon />,
                title: 'PRESENT',
                message: `You are marked present for today. Last log at ${lastLogTime?.toLocaleTimeString()}.`,
                bgColor: 'bg-green-900/40',
                borderColor: 'border-green-700/50',
                textColor: 'text-green-400',
            };
            break;
        case 'ABSENT':
            config = {
                ...config,
                icon: <CalendarPlusIcon />,
                title: 'ATTENDANCE PENDING',
                message: 'Your attendance for today has not been recorded yet. Click the button below to mark yourself present.',
                bgColor: 'bg-yellow-900/40',
                borderColor: 'border-yellow-700/50',
                textColor: 'text-yellow-400',
                button: (
                    <button onMouseMove={handleMouseMove} onClick={onMarkAttendanceClick} className="btn-animated mt-6 px-8 py-3 rounded-lg text-lg font-semibold text-white bg-blue-600 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500">
                        <span className="btn-content">
                            <span className="btn-dot"></span>
                            <span>Mark My Attendance</span>
                        </span>
                    </button>
                ),
            };
            break;
        case 'UNLINKED':
            config = {
                ...config,
                icon: <LinkIcon />,
                title: 'FACE NOT LINKED',
                message: 'To mark attendance, you first need to link your face to your profile.',
                bgColor: 'bg-blue-900/40',
                borderColor: 'border-blue-700/50',
                textColor: 'text-blue-400',
                button: (
                    <button onMouseMove={handleMouseMove} onClick={onLinkFaceClick} className="btn-animated mt-6 px-8 py-3 rounded-lg text-lg font-semibold text-white bg-blue-600 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500">
                        <span className="btn-content">
                            <span className="btn-dot"></span>
                            <span>Link My Face</span>
                        </span>
                    </button>
                ),
            };
            break;
        case 'BLOCKED':
            const isPermanent = blockExpiresAt === Infinity;
            config = {
                ...config,
                icon: <BlockedIcon />,
                title: 'ACCOUNT BLOCKED',
                message: `Your account has been blocked by ${blockedByAdminName}. You cannot mark attendance.`,
                bgColor: 'bg-red-900/40',
                borderColor: 'border-red-700/50',
                textColor: 'text-red-400',
                extraContent: (
                    <div className="mt-4 text-center">
                        {isPermanent ? (
                            <p className="font-bold text-lg text-white">This block is permanent.</p>
                        ) : (
                            <div>
                                <p className="text-gray-300">Access will be restored in:</p>
                                <p className="text-3xl font-mono font-bold text-white mt-1">{timeLeft}</p>
                            </div>
                        )}
                    </div>
                )
            };
            break;
    }

    return (
        <div className={`p-8 rounded-2xl text-center flex flex-col items-center justify-center transition-all duration-500 border h-full ${config.bgColor} ${config.borderColor}`}>
            <div className={config.textColor}>
                {config.icon}
            </div>
            <h3 className={`mt-4 text-3xl font-black tracking-tighter ${config.textColor}`}>{config.title}</h3>
            <p className="mt-2 max-w-md mx-auto text-gray-300">{config.message}</p>
            {config.extraContent}
            {config.button}
        </div>
    );
};