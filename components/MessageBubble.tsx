import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { MessageStatus } from './MessageStatus';
import { ExclamationIcon } from './ExclamationIcon';
import { DownloadIcon } from './DownloadIcon';

interface MessageBubbleProps {
    message: ChatMessage;
    allMessages: ChatMessage[];
    isOwn: boolean;
    senderType: 'Student' | 'Admin';
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    onReply: (msg: ChatMessage) => void;
    onDelete: (msgId: string) => void;
    highlightedMessageId?: string | null;
}

const MoreIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
);

const ReplyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);


export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, allMessages, isOwn, isLastInGroup, onReply, onDelete, highlightedMessageId }) => {
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

    const handleCopy = () => {
        if (message.content) {
            navigator.clipboard.writeText(message.content);
        }
        setIsMenuOpen(false);
    };

    const repliedToMessage = message.replyToMessageId ? allMessages.find(m => m.id === message.replyToMessageId) : null;

    const isHighlighted = highlightedMessageId === message.id;

    const bubbleColor = isOwn ? 'bg-[#e2ffc7] dark:bg-green-900/50' : 'bg-white dark:bg-gray-700';
    const textColor = 'text-gray-800 dark:text-gray-200';
    const alignmentClasses = isOwn ? 'self-end' : 'self-start';
    const cornerClasses = `rounded-lg ${isOwn && isLastInGroup ? 'rounded-br-none' : ''} ${!isOwn && isLastInGroup ? 'rounded-bl-none' : ''}`;
    const tailClass = isLastInGroup ? (isOwn ? 'bubble-tail-right-green' : 'bubble-tail-left') : '';
    const highlightClass = isHighlighted ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500' : '';
    
    return (
        <div 
            id={`message-${message.id}`}
            className={`group relative max-w-md px-3 py-2 shadow-sm transition-all duration-300 ${alignmentClasses} ${bubbleColor} ${textColor} ${cornerClasses} ${tailClass} ${highlightClass}`}
            style={{ '--bubble-bg': isOwn ? (document.documentElement.classList.contains('dark') ? '#1A4731' : '#e2ffc7') : (document.documentElement.classList.contains('dark') ? '#374151' : '#fff') } as React.CSSProperties}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
             <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-12' : 'right-0 -translate-x-full'}`}>
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
                            className={`absolute top-full mt-1 z-20 w-48 bg-gray-100 dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-white origin-top animate-scale-in-menu ${isOwn ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
                        >
                            <ul className="py-1">
                                <li onClick={() => { onReply(message); setIsMenuOpen(false); }} className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3"> <ReplyIcon className="w-4 h-4"/> Reply</li>
                                {message.content && <li onClick={handleCopy} className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3"> <CopyIcon className="w-4 h-4"/> Copy Text</li>}
                                <li onClick={() => { onDelete(message.id); setIsMenuOpen(false); }} className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3 text-red-500 dark:text-red-400"> <TrashIcon className="w-4 h-4"/> Delete for me</li>
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
             {repliedToMessage && (
                <div className="mb-2 p-2 border-l-2 border-blue-400 bg-black/5 dark:bg-black/20 rounded">
                    <p className="text-xs font-bold text-blue-500 dark:text-blue-300">{repliedToMessage.senderId === message.senderId ? 'Self' : 'Other'}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic truncate">{repliedToMessage.content || 'Attachment'}</p>
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
                 <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isOwn && message.status && <MessageStatus status={message.status} />}
            </div>
        </div>
    );
};