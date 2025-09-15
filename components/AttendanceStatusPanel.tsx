
import React from 'react';

type Status = 'PRESENT' | 'ABSENT' | 'BLOCKED' | 'UNLINKED';

interface AttendanceStatusPanelProps {
    status: Status;
    onMarkAttendanceClick: () => void;
    onLinkFaceClick: () => void;
    lastLogTime: Date | null;
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


export const AttendanceStatusPanel: React.FC<AttendanceStatusPanelProps> = ({ status, onMarkAttendanceClick, onLinkFaceClick, lastLogTime }) => {
    let config = {
        icon: <></>,
        title: '',
        message: '',
        button: null,
        bgColor: 'bg-slate-700/40',
        borderColor: 'border-slate-600/50',
        textColor: 'text-gray-300',
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
                button: null,
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
                    <button onClick={onMarkAttendanceClick} className="mt-6 px-8 py-3 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 active:translate-y-0.5">
                        Mark My Attendance
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
                    <button onClick={onLinkFaceClick} className="mt-6 px-8 py-3 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 active:translate-y-0.5">
                        Link My Face
                    </button>
                ),
            };
            break;
        case 'BLOCKED':
            config = {
                ...config,
                icon: <BlockedIcon />,
                title: 'ACCOUNT BLOCKED',
                message: 'Your account has been blocked by an administrator. You cannot mark attendance.',
                bgColor: 'bg-red-900/40',
                borderColor: 'border-red-700/50',
                textColor: 'text-red-400',
                button: null,
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
            {config.button}
        </div>
    );
};
