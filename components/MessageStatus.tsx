import React from 'react';

interface MessageStatusProps {
    status?: 'sent' | 'delivered' | 'read';
}

const CheckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

export const MessageStatus: React.FC<MessageStatusProps> = ({ status }) => {
    if (status === 'sent') {
        return <CheckIcon className="w-4 h-4 text-gray-400" />;
    }
    if (status === 'delivered') {
        return (
            <div className="relative w-5 h-4">
                <CheckIcon className="w-4 h-4 text-gray-400 absolute right-0" />
                <CheckIcon className="w-4 h-4 text-gray-400 absolute right-1" />
            </div>
        );
    }
    if (status === 'read') {
        return (
            <div className="relative w-5 h-4">
                <CheckIcon className="w-4 h-4 text-blue-400 absolute right-0" />
                <CheckIcon className="w-4 h-4 text-blue-400 absolute right-1" />
            </div>
        );
    }
    return null;
};