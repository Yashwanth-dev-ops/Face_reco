
import React from 'react';
import { ChatMessage, AdminInfo } from '../types';

interface NoticeBoardPanelProps {
    priorityMessages: (ChatMessage & { senderInfo: AdminInfo | null })[];
}

const MegaphoneIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.9999 1.5C12.4141 1.5 12.7499 1.83579 12.7499 2.25V4.31346C15.292 4.64696 17.353 6.70796 17.6865 9.25001H19.7499C20.1641 9.25001 20.4999 9.5858 20.4999 10C20.4999 10.4142 20.1641 10.75 19.7499 10.75H17.6865C17.353 13.2921 15.292 15.3531 12.7499 15.6865V17.25C12.7499 17.6642 12.4141 18 11.9999 18C11.5857 18 11.2499 17.6642 11.2499 17.25V15.6865C8.70786 15.3531 6.64686 13.2921 6.31336 10.75H4.24988C3.83567 10.75 3.49988 10.4142 3.49988 10C3.49988 9.5858 3.83567 9.25001 4.24988 9.25001H6.31336C6.64686 6.70796 8.70786 4.64696 11.2499 4.31346V2.25C11.2499 1.83579 11.5857 1.5 11.9999 1.5ZM8.24988 10.75C8.24988 12.8211 9.92881 14.5 11.9999 14.5C14.071 14.5 15.7499 12.8211 15.7499 10.75V9.25001C15.7499 7.17893 14.071 5.50001 11.9999 5.50001C9.92881 5.50001 8.24988 7.17893 8.24988 9.25001V10.75Z" />
      <path d="M19.5 21a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 3 0v2.5a1.5 1.5 0 0 1-1.5 1.5Z" />
      <path d="M14.5 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1Z" />
    </svg>
);

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
    return "just now";
};

export const NoticeBoardPanel: React.FC<NoticeBoardPanelProps> = ({ priorityMessages }) => {
    const noticesToShow = priorityMessages.slice(0, 3); // Show latest 3

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <MegaphoneIcon className="w-6 h-6 text-yellow-400" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">University Notice Board</h3>
                </div>
                {priorityMessages.length > 3 && (
                    <button className="text-sm font-semibold text-blue-400 hover:underline">View All</button>
                )}
            </div>
            {noticesToShow.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <p>No important notices at this time.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {noticesToShow.map(msg => {
                        const sender = msg.senderInfo;
                        if (!sender) return null;
                        return (
                            <div key={msg.id} className="p-4 rounded-lg bg-gray-100 dark:bg-gray-900/50 border-l-4 border-yellow-500 animate-fade-in">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{sender.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{sender.designation} - {sender.department}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{timeSince(msg.timestamp)}</p>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
