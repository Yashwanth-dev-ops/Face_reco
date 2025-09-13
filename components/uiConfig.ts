
import { Emotion, HandSign } from '../types';

type BaseUIConfig = {
    emoji: string;
    colors: {
        border: string;
        bg: string;
        text: string;
        labelBg: string;
    }
}

type EmotionUIConfigType = BaseUIConfig;
type HandSignUIConfigType = BaseUIConfig & { description: string };


export const emotionUIConfig: Record<Emotion, EmotionUIConfigType> = {
    [Emotion.Happy]:    { emoji: '😊', colors: { border: 'border-yellow-300', bg: 'bg-yellow-300', text: 'text-yellow-300', labelBg: 'bg-yellow-500' } },
    [Emotion.Sad]:      { emoji: '😢', colors: { border: 'border-blue-400',   bg: 'bg-blue-400',   text: 'text-blue-400',   labelBg: 'bg-blue-600' } },
    [Emotion.Angry]:    { emoji: '😡', colors: { border: 'border-red-500',    bg: 'bg-red-500',    text: 'text-red-500',    labelBg: 'bg-red-700' } },
    [Emotion.Surprised]:{ emoji: '😲', colors: { border: 'border-purple-400', bg: 'bg-purple-400', text: 'text-purple-400', labelBg: 'bg-purple-600' } },
    [Emotion.Neutral]:  { emoji: '😐', colors: { border: 'border-gray-400',   bg: 'bg-gray-400',   text: 'text-gray-400',   labelBg: 'bg-gray-600' } },
    [Emotion.Disgusted]:{ emoji: '🤢', colors: { border: 'border-green-600',  bg: 'bg-green-600',  text: 'text-green-600',  labelBg: 'bg-green-800' } },
    [Emotion.Fearful]:  { emoji: '😨', colors: { border: 'border-indigo-400', bg: 'bg-indigo-400', text: 'text-indigo-400', labelBg: 'bg-indigo-600' } },
};

export const handSignUIConfig: Record<HandSign, HandSignUIConfigType> = {
    [HandSign.ThumbsUp]:       { emoji: '👍', description: 'Approval / OK',      colors: { border: 'border-green-400',  bg: 'bg-green-400',  text: 'text-green-400',  labelBg: 'bg-green-600' } },
    [HandSign.ThumbsDown]:     { emoji: '👎', description: 'Disapproval',        colors: { border: 'border-red-400',    bg: 'bg-red-400',    text: 'text-red-400',    labelBg: 'bg-red-600' } },
    [HandSign.Peace]:          { emoji: '✌️', description: 'Victory / Peace',    colors: { border: 'border-pink-400',   bg: 'bg-pink-400',   text: 'text-pink-400',   labelBg: 'bg-pink-600' } },
    [HandSign.OK]:             { emoji: '👌', description: 'Okay / Perfect',     colors: { border: 'border-orange-400', bg: 'bg-orange-400', text: 'text-orange-400', labelBg: 'bg-orange-600' } },
    [HandSign.Fist]:           { emoji: '✊', description: 'Power / Solidarity', colors: { border: 'border-gray-300',   bg: 'bg-gray-300',   text: 'text-gray-300',   labelBg: 'bg-gray-500' } },
    [HandSign.Wave]:           { emoji: '👋', description: 'Greeting / Goodbye', colors: { border: 'border-teal-300',   bg: 'bg-teal-300',   text: 'text-teal-300',   labelBg: 'bg-teal-500' } },
    [HandSign.Pointing]:       { emoji: '👉', description: 'Pointing / Direction', colors: { border: 'border-cyan-400',   bg: 'bg-cyan-400',   text: 'text-cyan-400',   labelBg: 'bg-cyan-600' } },
    [HandSign.HighFive]:       { emoji: '🖐️', description: 'High Five / Stop',   colors: { border: 'border-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', labelBg: 'bg-yellow-600' } },
    [HandSign.CallMe]:         { emoji: '🤙', description: 'Call Me / Shaka',    colors: { border: 'border-lime-400',   bg: 'bg-lime-400',   text: 'text-lime-400',   labelBg: 'bg-lime-600' } },
    [HandSign.CrossedFingers]: { emoji: '🤞', description: 'Good Luck / Hope',   colors: { border: 'border-purple-400', bg: 'bg-purple-400', text: 'text-purple-400', labelBg: 'bg-purple-600' } },
    [HandSign.Love]:           { emoji: '🤟', description: 'I Love You',         colors: { border: 'border-rose-500',   bg: 'bg-rose-500',   text: 'text-rose-500',   labelBg: 'bg-rose-700' } },
};