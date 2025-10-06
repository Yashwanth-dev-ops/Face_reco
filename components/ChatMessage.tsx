import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GroupChatMessage } from '../types';
import { DownloadIcon } from './DownloadIcon';

// --- Icon Components ---
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

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


// Fix: Export WaveformPlayer to be used in other components.
export const WaveformPlayer: React.FC<{ src: string, duration: number }> = ({ src, duration }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressContainerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        const handleTimeUpdate = () => {
            if (audio && audio.duration) {
                setProgress(audio.currentTime / audio.duration);
                setCurrentTime(audio.currentTime);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio?.addEventListener('timeupdate', handleTimeUpdate);
        audio?.addEventListener('ended', handleEnded);
        return () => {
            audio?.removeEventListener('timeupdate', handleTimeUpdate);
            audio?.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (progressContainerRef.current && audioRef.current && audioRef.current.duration) {
            const rect = progressContainerRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            audioRef.current.currentTime = audioRef.current.duration * percentage;
        }
    };
    
    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <div className="flex items-center gap-2 w-64 mt-2">
            <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
            <button onClick={togglePlay} className="w-8 h-8 flex-shrink-0 bg-white/20 rounded-full flex items-center justify-center text-white">
                {isPlaying ? 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" /></svg> :
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                }
            </button>
            <div ref={progressContainerRef} onClick={handleSeek} className="flex-grow h-full flex items-center relative cursor-pointer group">
                <div className="w-full h-1 bg-white/30 rounded-full"></div>
                <div className="absolute top-0 left-0 h-full w-full">
                    <div className="h-1 bg-white rounded-full" style={{ width: `${progress * 100}%` }}></div>
                    <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow" style={{ left: `calc(${progress * 100}% - 6px)` }}></div>
                </div>
            </div>
             <span className="text-xs font-mono w-12 text-right">{formatTime(duration)}</span>
        </div>
    );
};


export const Message: React.FC<{
    msg: GroupChatMessage;
    allMessages: GroupChatMessage[];
    isOwn: boolean;
    isPinned: boolean;
    canPin: boolean;
    onPin: (msgId: string) => void;
    currentUserRoll: string;
    onDelete: (msgId: string, deleteType: 'me' | 'everyone') => void;
    isGroupAdmin: boolean;
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    onReply: (msg: GroupChatMessage) => void;
    menuRef: React.RefObject<HTMLDivElement>;
}> = ({ msg, allMessages, isOwn, isPinned, canPin, onPin, currentUserRoll, onDelete, isGroupAdmin, openMenuId, setOpenMenuId, onReply, menuRef }) => {
    
    const [isHovered, setIsHovered] = useState(false);
    
    // Handle "deleted for everyone"
    if (msg.isDeleted) {
        if (isOwn) {
            // Sender sees a placeholder
            return (
                <div className="flex justify-center my-1">
                    <div className="px-3 py-1 rounded-lg bg-gray-700/80 text-gray-400 italic text-xs">
                        You deleted this message
                    </div>
                </div>
            );
        } else {
            // Recipients see nothing, for privacy
            return null;
        }
    }

    // Handle "deleted for me"
    if (msg.deletedFor && msg.deletedFor.includes(currentUserRoll)) {
        return (
            <div className="flex justify-center my-1">
                <div className="px-3 py-1 rounded-lg bg-gray-700/80 text-gray-400 italic text-xs">
                    You deleted this message
                </div>
            </div>
        );
    }

    const canDeleteEveryone = isOwn || isGroupAdmin;
    
    const handleCopy = () => {
        if (msg.content) {
            navigator.clipboard.writeText(msg.content);
        }
        setOpenMenuId(null);
    };

    const repliedToMessage = useMemo(() => {
        if (!msg.replyToMessageId) return null;
        return allMessages.find(m => m.id === msg.replyToMessageId);
    }, [msg.replyToMessageId, allMessages]);


    return (
         <div 
            className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`relative max-w-md px-4 py-3 rounded-2xl ${isOwn ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                 <div className="absolute top-1 right-2">
                    <div className="relative">
                        <button 
                            onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                            className={`p-1 rounded-full text-gray-300 hover:bg-black/20 transition-opacity ${isHovered || openMenuId === msg.id ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <MoreIcon className="w-4 h-4" />
                        </button>

                        {openMenuId === msg.id && (
                            <div 
                                ref={menuRef} 
                                className="absolute top-full mt-1 right-0 z-20 w-48 bg-gray-900 rounded-md shadow-lg border border-gray-700 text-sm text-white origin-top-right animate-scale-in-menu"
                            >
                                <ul className="py-1">
                                    <li onClick={() => { onReply(msg); setOpenMenuId(null); }} className="px-4 py-2 hover:bg-gray-800 active:bg-gray-700 transition-colors duration-150 cursor-pointer flex items-center gap-3"> <ReplyIcon className="w-4 h-4"/> Reply</li>
                                    {msg.content && <li onClick={handleCopy} className="px-4 py-2 hover:bg-gray-800 active:bg-gray-700 transition-colors duration-150 cursor-pointer flex items-center gap-3"> <CopyIcon className="w-4 h-4"/> Copy Text</li>}
                                    <li onClick={() => { onDelete(msg.id, 'me'); setOpenMenuId(null); }} className="px-4 py-2 hover:bg-gray-800 active:bg-gray-700 transition-colors duration-150 cursor-pointer flex items-center gap-3 text-red-400"> <TrashIcon className="w-4 h-4"/> Delete for me</li>
                                    {canDeleteEveryone && <li onClick={() => { onDelete(msg.id, 'everyone'); setOpenMenuId(null); }} className="px-4 py-2 hover:bg-gray-800 active:bg-gray-700 transition-colors duration-150 cursor-pointer flex items-center gap-3 text-red-400"> <TrashIcon className="w-4 h-4"/> Delete for everyone</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                
                <p className="text-xs font-bold opacity-80 mb-1">{isOwn ? 'You' : msg.senderId}</p>
                 {repliedToMessage && !repliedToMessage.isDeleted && (
                    <div className="mb-2 p-2 border-l-2 border-blue-400 bg-black/20 rounded">
                        <p className="text-xs font-bold text-blue-300">{repliedToMessage.senderId}</p>
                        <p className="text-xs text-gray-300 italic truncate">{repliedToMessage.content || 'Attachment'}</p>
                    </div>
                )}
                {msg.content && <p className="text-base whitespace-pre-wrap">{msg.content}</p>}
                
                {msg.file && (
                    <a href={msg.file.url} download={msg.file.name} className="mt-2 flex items-center gap-2 bg-black/20 p-2 rounded-lg hover:bg-black/40">
                        <DownloadIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-semibold truncate">{msg.file.name}</span>
                    </a>
                )}
                
                {msg.audio && msg.audio.url && (
                    <WaveformPlayer src={msg.audio.url} duration={msg.audio.duration} />
                )}

                <p className="text-xs opacity-60 mt-2 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>
    )
}