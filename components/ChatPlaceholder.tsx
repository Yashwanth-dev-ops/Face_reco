import React from 'react';
import { PadlockIcon } from './PadlockIcon';

export const ChatPlaceholder: React.FC = () => {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center bg-gray-200 dark:bg-gray-800 border-b-8 border-green-600">
             <div className="w-64 h-64 bg-gray-300 dark:bg-gray-700/50 rounded-full flex items-center justify-center">
                 <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-40 h-40 rounded-full" />
             </div>
            <h2 className="text-3xl font-light text-gray-700 dark:text-gray-400 mt-8">Krishna University Connect</h2>
            <p className="text-gray-500 dark:text-gray-500 mt-2 max-w-sm">
                Send and receive messages with staff and students. Select a chat to get started.
            </p>
            <div className="absolute bottom-8 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <PadlockIcon className="w-4 h-4" />
                <span>End-to-end encrypted (Simulated)</span>
            </div>
        </div>
    );
};
