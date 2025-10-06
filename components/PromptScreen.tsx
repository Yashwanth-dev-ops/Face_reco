import React, { useState, useRef, useEffect } from 'react';
import { askAI } from '../services/geminiService';
import { StudentInfo } from '../types';
import { SparklesIcon } from './SparklesIcon';

interface PromptScreenProps {
    onBack: () => void;
    studentDirectory: Map<string, StudentInfo>;
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
    </div>
);

export const PromptScreen: React.FC<PromptScreenProps> = ({ onBack, studentDirectory }) => {
    const [inputValue, setInputValue] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [inputValue]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const prompt = inputValue.trim();
        if (!prompt || isLoading) return;

        setError('');
        setInputValue('');
        setIsLoading(true);
        setChatHistory(prev => [...prev, { role: 'user', content: prompt }]);

        try {
            // Create a summarized context from the student directory
            const studentDataContext = Array.from(studentDirectory.values())
                .map(({ name, rollNumber, department, year, section, blockExpiresAt }) => 
                    `Roll: ${rollNumber}, Name: ${name}, Dept: ${department}, Year: ${year}, Sec: ${section}, Blocked: ${blockExpiresAt !== null && blockExpiresAt > Date.now()}`
                ).join('\n');
            
            const response = await askAI(prompt, studentDataContext);
            setChatHistory(prev => [...prev, { role: 'model', content: response }]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col h-screen animate-fade-in bg-gray-900">
            <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex items-center gap-2 mx-auto">
                    <SparklesIcon className="w-6 h-6 text-yellow-300" />
                    <h1 className="text-xl font-bold">AI Assistant</h1>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <main ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-6">
                {chatHistory.length === 0 && !isLoading && (
                     <div className="text-center text-gray-500 pt-16">
                        <SparklesIcon className="w-16 h-16 mx-auto text-gray-700" />
                        <h2 className="mt-4 text-lg font-semibold text-gray-400">Ask me anything about your data</h2>
                        <p className="mt-1 text-sm">Examples:</p>
                        <div className="mt-4 flex flex-col items-center gap-2">
                            <p className="text-xs font-mono bg-gray-800/50 p-2 rounded-md inline-block">"How many students are in 3rd year CSE?"</p>
                            <p className="text-xs font-mono bg-gray-800/50 p-2 rounded-md inline-block">"List all blocked students"</p>
                        </div>
                    </div>
                )}

                {chatHistory.map((message, index) => (
                    <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center flex-shrink-0">
                                <SparklesIcon className="w-5 h-5 text-blue-200" />
                            </div>
                        )}
                        <div className={`max-w-lg p-3 rounded-2xl ${
                            message.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-lg' 
                                : 'bg-gray-800 text-gray-300 rounded-bl-lg'
                        }`}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-blue-200" />
                        </div>
                        <div className="max-w-md p-3 rounded-2xl bg-gray-800 rounded-bl-lg">
                            <TypingIndicator />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 text-center text-sm text-red-400 bg-red-900/40 rounded-lg">{error}</div>
                )}
            </main>

            <footer className="flex-shrink-0 p-4 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 sticky bottom-0">
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Ask a question..."
                        rows={1}
                        className="flex-grow bg-gray-700 text-gray-200 rounded-lg p-3 resize-none focus:outline-none max-h-32 no-scrollbar"
                    />
                    <button type="submit" disabled={isLoading || !inputValue.trim()} className="w-12 h-12 flex-shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};