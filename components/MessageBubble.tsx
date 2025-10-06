import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { MessageStatus } from './MessageStatus';
import { ExclamationIcon } from './ExclamationIcon';
import { DownloadIcon } from './DownloadIcon';

interface MessageBubbleProps {
    message: ChatMessage;
    isOwn: boolean;
    senderType: 'Student' | 'Admin';
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
}

const MoreIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, senderType, isFirstInGroup, isLastInGroup }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleReport = () => {
        console.log(`REPORTED MESSAGE: ID=${message.id}, Content="${message.content}"`);
        alert('This message has been reported for review. (Simulated Action)');
        setIsMenuOpen(false);
    };

    const bubbleColor = isOwn ? 'bg-[#e2ffc7] dark:bg-green-900/50' : 'bg-white dark:bg-gray-700';
    const textColor = 'text-gray-800 dark:text-gray-200';

    const alignmentClasses = isOwn ? 'self-end' : 'self-start';
    
    const cornerClasses = `rounded-lg ${isOwn && isLastInGroup ? 'rounded-br-none' : ''} ${!isOwn && isLastInGroup ? 'rounded-bl-none' : ''}`;

    const tailClass = isLastInGroup ? (isOwn ? 'bubble-tail-right-green' : 'bubble-tail-left') : '';
    
    return (
        <div 
            className={`group relative max-w-md px-3 py-2 shadow-sm ${alignmentClasses} ${bubbleColor} ${textColor} ${cornerClasses} ${tailClass}`}
            style={{ '--bubble-bg': isOwn ? (document.documentElement.classList.contains('dark') ? '#1A4731' : '#e2ffc7') : (document.documentElement.classList.contains('dark') ? '#374151' : '#fff') } as React.CSSProperties}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
             <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-12' : '-right-12'}`}>
                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        className={`p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-gray-600 transition-opacity ${isHovered || isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <MoreIcon className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div 
                            ref={menuRef} 
                            className={`absolute top-full mt-1 z-20 w-40 bg-gray-100 dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-white origin-top animate-scale-in-menu ${isOwn ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
                        >
                            <ul className="py-1">
                                <li onClick={handleReport} className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-2 text-red-500 dark:text-red-400">
                                    <ExclamationIcon className="w-4 h-4"/> Report
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

             {message.isPriority && (
                <div className="absolute -top-2 -left-2 bg-yellow-400 p-1 rounded-full shadow-lg">
                    <ExclamationIcon className="w-3 h-3 text-yellow-900" />
                </div>
            )}

            {message.file && (
                <a 
                    href={message.file.url} 
                    download={message.file.name}
                    className="flex items-center gap-3 bg-black/5 dark:bg-black/20 p-2 rounded-lg hover:bg-black/10 dark:hover:bg-black/40 transition-colors mb-2"
                >
                    <div className="flex-shrink-0 bg-blue-500 text-white p-2 rounded-lg">
                        <DownloadIcon className="w-5 h-5"/>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate">{message.file.name}</p>
                    </div>
                </a>
            )}

            {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
            
            <div className="flex items-center justify-end gap-1.5 mt-1">
                 <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isOwn && message.status && <MessageStatus status={message.status} />}
            </div>
        </div>
    );
};