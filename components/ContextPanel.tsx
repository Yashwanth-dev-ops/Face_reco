import React, { useState } from 'react';
import { Conversation, AdminInfo, StudentInfo } from '../types';
import { DownloadIcon } from './DownloadIcon';

interface ContextPanelProps {
    participant: (StudentInfo & { type: 'Student'}) | (AdminInfo & { type: 'Admin' });
    conversation: Conversation;
    onClose: () => void;
}

const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const ContextPanel: React.FC<ContextPanelProps> = ({ participant, conversation, onClose }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'media'>('details');

    const sharedMedia = conversation.messages.filter(m => m.file).reverse(); // Newest first

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800/80">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Details</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </header>
            
            <div className="p-4 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
                <img src={participant.photoBase64 || 'https://via.placeholder.com/80'} alt={participant.name} className="w-20 h-20 rounded-full object-cover" />
                <p className="mt-3 font-bold text-lg text-gray-900 dark:text-white">{participant.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{participant.type === 'Admin' ? participant.designation : 'Student'}</p>
            </div>

            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-2">
                    <button onClick={() => setActiveTab('details')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'details' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Details</button>
                    <button onClick={() => setActiveTab('media')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'media' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Shared Media</button>
                </nav>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'details' && (
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="font-semibold text-gray-600 dark:text-gray-400">Department</p>
                            <p className="text-gray-900 dark:text-white">{participant.department}</p>
                        </div>
                         <div>
                            <p className="font-semibold text-gray-600 dark:text-gray-400">Email Address</p>
                            <p className="text-gray-900 dark:text-white break-all">{participant.email}</p>
                        </div>
                         <div>
                            <p className="font-semibold text-gray-600 dark:text-gray-400">Phone Number</p>
                            <p className="text-gray-900 dark:text-white">{participant.phoneNumber}</p>
                        </div>
                        {participant.type === 'Student' && (
                             <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">Roll Number</p>
                                <p className="text-gray-900 dark:text-white font-mono">{participant.rollNumber}</p>
                            </div>
                        )}
                         {participant.type === 'Admin' && (
                             <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-400">ID Number</p>
                                <p className="text-gray-900 dark:text-white font-mono">{participant.idNumber}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'media' && (
                    <div>
                        {sharedMedia.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No files have been shared in this conversation.</p>
                        ) : (
                            <ul className="space-y-3">
                                {sharedMedia.map(msg => (
                                    <li key={msg.id}>
                                        <a 
                                            href={msg.file!.url} 
                                            download={msg.file!.name}
                                            className="flex items-center gap-3 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex-shrink-0 bg-blue-500 text-white p-2 rounded-lg">
                                                <DownloadIcon className="w-5 h-5"/>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{msg.file!.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Sent by {msg.senderId === participant.email ? participant.name.split(' ')[0] : 'You'}
                                                </p>
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};