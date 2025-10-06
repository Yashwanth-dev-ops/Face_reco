import React from 'react';
import { Emotion } from '../types';
import { emotionUIConfig } from './uiConfig';

interface EmotionDisplayProps {
    emotion: Emotion;
    showLabel?: boolean;
    className?: string;
}

export const EmotionDisplay: React.FC<EmotionDisplayProps> = ({ emotion, showLabel = true, className }) => {
    const config = emotionUIConfig[emotion] || emotionUIConfig[Emotion.Neutral];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-xl">{config.emoji}</span>
            {showLabel && <span className="font-semibold text-sm text-gray-300">{emotion}</span>}
        </div>
    );
};
