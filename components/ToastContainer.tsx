import React from 'react';
import { Toast } from '../types';
import { ToastComponent } from './Toast';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed top-5 right-5 z-[100] w-full max-w-sm space-y-3">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};