
export enum Emotion {
    Happy = 'Happy',
    Sad = 'Sad',
    Angry = 'Angry',
    Surprised = 'Surprised',
    Neutral = 'Neutral',
    Disgusted = 'Disgusted',
    Fearful = 'Fearful',
}

export enum HandSign {
    ThumbsUp = 'Thumbs Up',
    ThumbsDown = 'Thumbs Down',
    Peace = 'Peace',
    OK = 'OK',
    Fist = 'Fist',
    Wave = 'Wave',
    Pointing = 'Pointing',
    HighFive = 'High Five',
    CallMe = 'Call Me',
    CrossedFingers = 'Crossed Fingers',
    Love = 'Love',
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface StudentInfo {
    name: string;
    rollNumber: string;
}

export interface AttendanceRecord {
    persistentId: number;
    timestamp: number;
    emotion: Emotion;
}


export interface FaceResult {
    personId: string;
    emotion: Emotion;
    confidence: number;
    boundingBox: BoundingBox;
    persistentId?: number;
    studentInfo?: StudentInfo;
}

export interface HandResult {
    sign: HandSign;
    confidence: number;
    boundingBox: BoundingBox;
}

export interface DetectionResult {
    faces: FaceResult[];
    hands: HandResult[];
}