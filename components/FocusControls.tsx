import React from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import { MediaSettingsRange } from '../types';

interface FocusControlsProps {
    capabilities: {
        focusDistance?: MediaSettingsRange;
    };
    isAutoFocus: boolean;
    onAutoFocusChange: (enabled: boolean) => void;
    manualFocusValue: number;
    onManualFocusChange: (value: number) => void;
}

const FocusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
);


export const FocusControls: React.FC<FocusControlsProps> = ({
    capabilities,
    isAutoFocus,
    onAutoFocusChange,
    manualFocusValue,
    onManualFocusChange
}) => {
    const { focusDistance } = capabilities;
    if (!focusDistance) return null;

    return (
        <div className="w-full max-w-sm mx-auto p-4 rounded-lg bg-gray-700/50 dark:bg-gray-800/50 border border-gray-600 dark:border-gray-700/80 backdrop-blur-sm mt-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <FocusIcon className="w-5 h-5 text-gray-300 dark:text-gray-400" />
                    <span className="font-semibold text-white">Camera Focus</span>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="autofocus-toggle" className="text-sm text-gray-300 dark:text-gray-400">Auto</label>
                    <ToggleSwitch checked={isAutoFocus} onChange={onAutoFocusChange} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <span className="text-xs text-gray-400">Near</span>
                 <input
                    type="range"
                    min={focusDistance.min}
                    max={focusDistance.max}
                    step={focusDistance.step}
                    value={manualFocusValue}
                    onChange={(e) => onManualFocusChange(parseFloat(e.target.value))}
                    disabled={isAutoFocus}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Manual camera focus"
                />
                <span className="text-xs text-gray-400">Far</span>
            </div>
        </div>
    );
};