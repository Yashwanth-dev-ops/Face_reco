import React, { useState } from 'react';
import { SimulatedEmail } from '../types';

interface MockInboxProps {
    emails: SimulatedEmail[];
}

const MailIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const InboxModal: React.FC<{ emails: SimulatedEmail[], onClose: () => void }> = ({ emails, onClose }) => {
    return (
         <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-700 w-full max-w-lg m-4 max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center pb-3 mb-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Mock Inbox</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6"/>
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {emails.length === 0 ? (
                        <p className="text-center text-gray-500 py-16">No simulated emails have been sent yet.</p>
                    ) : (
                        emails.map((email, index) => (
                            <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                                <p className="text-sm text-gray-400">To: <span className="font-medium text-gray-300">{email.to}</span></p>
                                <p className="text-lg font-bold text-white mt-1">{email.subject}</p>
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <p className="whitespace-pre-wrap text-gray-300">{email.body}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export const MockInbox: React.FC<MockInboxProps> = ({ emails }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasUnread = emails.length > 0;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-5 right-5 z-40 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-500 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                aria-label="Open Mock Inbox"
            >
                <MailIcon className="w-8 h-8"/>
                {hasUnread && (
                     <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 items-center justify-center text-xs font-bold">
                           {emails.length}
                        </span>
                    </span>
                )}
            </button>
            {isOpen && <InboxModal emails={emails} onClose={() => setIsOpen(false)} />}
        </>
    );
};
