import React from 'react';
import { Notification, NotificationType } from '../types';

interface NotificationPanelProps {
    notifications: Notification[];
    unreadCount: number;
    onMarkAsRead: (notificationId: string) => void;
    onMarkAllAsRead: () => void;
    onClose: () => void;
    onNotificationClick: (notification: Notification) => void;
}

const BellIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const getIconForType = (type: NotificationType) => {
    switch(type) {
        case 'DIRECT_MESSAGE': return '💬';
        case 'GROUP_INVITE': return '➕';
        case 'LEAVE_REQUEST': return '🗓️';
        case 'ANNOUNCEMENT': return '📢';
        default: return '🔔';
    }
};

const timeSince = (date: number) => {
    const seconds = Math.floor((new Date().getTime() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onClose, onNotificationClick }) => {
    return (
        <div className="absolute right-0 mt-2 w-80 max-w-sm bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50 origin-top-right animate-scale-in-menu">
            <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                    <button onClick={onMarkAllAsRead} className="text-xs text-blue-400 hover:underline">Mark all as read</button>
                )}
            </header>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        <BellIcon className="w-12 h-12 mx-auto" />
                        <p className="mt-2 text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    <ul>
                        {notifications.map(notif => (
                            <li key={notif.id} className={`border-b border-gray-700/50 ${notif.isRead ? 'opacity-60' : 'bg-blue-900/20'} ${notif.linkTo ? 'cursor-pointer hover:bg-gray-700/50' : ''}`}>
                                <button
                                    onClick={() => { if (notif.linkTo) { onNotificationClick(notif); onClose(); } }}
                                    disabled={!notif.linkTo}
                                    className="w-full text-left p-4 disabled:cursor-default"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="text-lg mt-1">{getIconForType(notif.type)}</div>
                                        <div className="flex-grow">
                                            {(notif.type === 'ANNOUNCEMENT' || notif.type === 'GROUP_INVITE') ? (
                                                <>
                                                    <p className="text-xs text-gray-400">From: <span className="font-semibold text-gray-200">{notif.senderName}</span></p>
                                                    <p className="text-sm font-bold text-white mt-0.5">{notif.title}</p>
                                                </>
                                            ) : (
                                                <p className="text-sm font-bold text-white">{notif.title}</p>
                                            )}
                                            <p className="text-sm text-gray-300 mt-1">{notif.message}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-xs text-gray-400">{timeSince(notif.timestamp)}</p>
                                                {!notif.isRead && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onMarkAsRead(notif.id); }} 
                                                        className="text-xs text-blue-400 hover:underline"
                                                    >
                                                        Mark as read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};