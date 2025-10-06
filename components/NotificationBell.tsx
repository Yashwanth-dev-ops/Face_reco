import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Notification } from '../types';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
    notifications: Notification[];
    onMarkAsRead: (notificationId: string) => void;
    onMarkAllAsRead: () => void;
}

const BellIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

export const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onMarkAsRead, onMarkAllAsRead }) => {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const unreadCount = useMemo(() => 
        notifications.filter(n => !n.isRead).length
    , [notifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white group"
                aria-label="View notifications"
            >
                <BellIcon className={`w-6 h-6 ${unreadCount > 0 ? 'animate-bell-ring group-hover:animate-none' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-gray-800" />
                )}
            </button>
            {isOpen && (
                <NotificationPanel
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onMarkAsRead={onMarkAsRead}
                    onMarkAllAsRead={onMarkAllAsRead}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};