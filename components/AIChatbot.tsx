import React, { useState, useRef, useEffect } from 'react';
import { askAI } from '../services/geminiService';
import { StudentInfo, AdminInfo } from '../types';
import { SparklesIcon } from './SparklesIcon';

interface AIChatbotProps {
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
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

const CloseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);


const ChatModal: React.FC<{ 
    onClose: () => void; 
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
}> = ({ onClose, studentDirectory, adminDirectory }) => {
    const [inputValue, setInputValue] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [chatHistory, isLoading]);

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
            const studentDataContext = Array.from(studentDirectory.values())
                .map(({ name, rollNumber, department, year, section, blockExpiresAt }) => 
                    `Roll: ${rollNumber}, Name: ${name}, Dept: ${department}, Year: ${year}, Sec: ${section}, Blocked: ${blockExpiresAt !== null && blockExpiresAt > Date.now()}`
                ).join('\n');
            const adminDataContext = Array.from(adminDirectory.values())
                .map(({ name, idNumber, department, designation, isPresentToday }) =>
                    `ID: ${idNumber}, Name: ${name}, Dept: ${department}, Role: ${designation}, Present Today: ${isPresentToday ?? true}`
                ).join('\n');

            const context = `--- STUDENT DATA ---\n${studentDataContext}\n\n--- ADMIN DATA ---\n${adminDataContext}`;
            
            const response = await askAI(prompt, context);
            setChatHistory(prev => [...prev, { role: 'model', content: response }]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderMarkdown = (text: string) => {
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>') // Bold
            .replace(/\n\s*-\s*(.*)/g, '<li class="ml-4">$1</li>') // List items
            .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>'); // Wrap lists
        return { __html: html };
    };

    return (
        <div className="fixed bottom-24 left-5 z-50 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md h-[70vh] flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-yellow-300" />
                    <h1 className="text-xl font-bold text-white">AI Assistant</h1>
                </div>
                <button onClick={onClose} className="ml-auto p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <CloseIcon className="w-6 h-6"/>
                </button>
            </header>

            <main ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-6">
                 {chatHistory.length === 0 && !isLoading && (
                     <div className="text-center text-gray-500 pt-16">
                        <h2 className="text-lg font-semibold text-gray-400">Ask me anything</h2>
                        <div className="mt-4 flex flex-col items-center gap-2">
                            <p className="text-xs font-mono bg-gray-700/50 p-2 rounded-md inline-block">"How many students are in 3rd year CSE?"</p>
                            <p className="text-xs font-mono bg-gray-700/50 p-2 rounded-md inline-block">"List all teachers who are not present today"</p>
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
                        <div className={`max-w-lg p-3 rounded-2xl prose prose-invert text-gray-300 ${ message.role === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-gray-700 rounded-bl-lg' }`}>
                             <div dangerouslySetInnerHTML={renderMarkdown(message.content)} />
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-blue-200" />
                        </div>
                        <div className="p-3 rounded-2xl bg-gray-700 rounded-bl-lg"> <TypingIndicator /> </div>
                    </div>
                )}
                {error && <div className="p-3 text-center text-sm text-red-400 bg-red-900/40 rounded-lg">{error}</div>}
            </main>

            <footer className="flex-shrink-0 p-4 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700">
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} placeholder="Ask a question..." rows={1} className="flex-grow bg-gray-700 text-gray-200 rounded-lg p-3 resize-none focus:outline-none max-h-24 no-scrollbar" />
                    <button type="submit" disabled={isLoading || !inputValue.trim()} className="w-12 h-12 flex-shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export const AIChatbot: React.FC<AIChatbotProps> = ({ studentDirectory, adminDirectory }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-5 left-5 z-40 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-indigo-500 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
                aria-label="Open AI Assistant"
            >
                <SparklesIcon className="w-8 h-8"/>
            </button>
            {isOpen && <ChatModal onClose={() => setIsOpen(false)} studentDirectory={studentDirectory} adminDirectory={adminDirectory} />}
        </>
    );
};
