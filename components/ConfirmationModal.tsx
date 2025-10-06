
import React from 'react';

interface ConfirmationModalProps {
    title: string;
    message: string | React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'red' | 'blue';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'blue'
}) => {
    const confirmButtonClasses = {
        red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
            onClick={onCancel}
            aria-modal="true"
            role="dialog"
            aria-labelledby="confirmation-title"
        >
            <div 
                className="bg-gray-100 dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-200 dark:border-slate-700 w-full max-w-md m-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 id="confirmation-title" className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <div className="text-gray-600 dark:text-gray-300 mt-2 text-base">
                        {message}
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-slate-700">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded-md font-semibold text-gray-800 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 w-full"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-md font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-slate-800 w-full ${confirmButtonClasses[confirmColor]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};