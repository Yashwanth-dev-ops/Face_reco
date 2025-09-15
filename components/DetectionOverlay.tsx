
import React from 'react';
import { DetectionResult, FaceResult, HandResult } from '../types';
import { emotionUIConfig, handSignUIConfig } from './uiConfig';

interface DetectionOverlayProps {
    result: DetectionResult;
    videoWidth: number;
    videoHeight: number;
    onRegister: (face: FaceResult) => void;
}

const BoundingBox: React.FC<{
    box: { x: number, y: number, width: number, height: number };
    label: string;
    idLabel: string;
    emoji: string;
    colors: { border: string; labelBg: string; };
    videoWidth: number;
    videoHeight: number;
    face: FaceResult;
    onRegister: (face: FaceResult) => void;
}> = ({ box, label, idLabel, emoji, colors, videoWidth, videoHeight, face, onRegister }) => {
    
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${box.x * videoWidth}px`,
        top: `${box.y * videoHeight}px`,
        width: `${box.width * videoWidth}px`,
        height: `${box.height * videoHeight}px`,
        pointerEvents: 'all'
    };
    
    const isRegistered = !!face.studentInfo;
    const isBlocked = face.studentInfo?.isBlocked === true;
    const borderColor = isBlocked ? 'border-red-500' : colors.border;

    return (
        <div style={style} className={`border-2 ${borderColor} rounded-md shadow-lg animate-fade-in flex flex-col justify-end`}>
            <div className={`absolute -top-7 left-0 text-sm font-bold text-white px-2 py-1 rounded-md ${colors.labelBg} bg-opacity-90 backdrop-blur-sm whitespace-nowrap`}>
                {emoji} {label} {isBlocked && '(Blocked)'}
            </div>
            
            {!isRegistered && face.persistentId && (
                <button
                    onClick={() => onRegister(face)}
                    className="w-full bg-indigo-600/90 backdrop-blur-sm text-white text-sm font-bold p-2 rounded-b-md hover:bg-indigo-500 transition-colors shadow-lg animate-pulse-fast text-center"
                >
                    Link <span className="font-extrabold">{idLabel}</span>
                </button>
            )}
        </div>
    );
};


export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ result, videoWidth, videoHeight, onRegister }) => {
    if (!result || (!result.faces.length && !result.hands.length)) {
        return null;
    }

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            {result.faces.map((face: FaceResult, index) => {
                const config = emotionUIConfig[face.emotion];
                const idLabel = face.studentInfo ? face.studentInfo.name : (face.persistentId ? `Person ${face.persistentId}` : face.personId);
                const label = `${idLabel} - ${face.emotion} (${Math.round(face.confidence * 100)}%)`;
                return (
                    <BoundingBox
                        key={`face-${face.persistentId || index}`}
                        box={face.boundingBox}
                        label={label}
                        idLabel={idLabel}
                        emoji={config.emoji}
                        colors={config.colors}
                        videoWidth={videoWidth}
                        videoHeight={videoHeight}
                        face={face}
                        onRegister={onRegister}
                    />
                );
            })}
            {result.hands.map((hand: HandResult, index) => {
                const config = handSignUIConfig[hand.sign];
                const label = `${hand.sign} (${Math.round(hand.confidence * 100)}%)`;
                // A simplified BoundingBox for hands which don't have registration
                const handStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${hand.boundingBox.x * videoWidth}px`,
                    top: `${hand.boundingBox.y * videoHeight}px`,
                    width: `${hand.boundingBox.width * videoWidth}px`,
                    height: `${hand.boundingBox.height * videoHeight}px`,
                };
                return (
                     <div key={`hand-${index}`} style={handStyle} className={`border-2 ${config.colors.border} rounded-md shadow-lg animate-fade-in`}>
                        <div className={`absolute -top-7 left-0 text-sm font-bold text-white px-2 py-1 rounded-md ${config.colors.labelBg} bg-opacity-90 backdrop-blur-sm whitespace-nowrap`}>
                            {config.emoji} {label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};