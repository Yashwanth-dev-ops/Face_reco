import React, { useState, useRef, useEffect } from 'react';
import { askAI } from '../services/geminiService';
import { SparklesIcon } from './SparklesIcon';

interface AITutorModalProps {
    subject: string;
    onClose: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-6 h-6 border-2 border-t-2 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
);

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
    </div>
);


export const AITutorModal: React.FC<AITutorModalProps> = ({ subject, onClose }) => {
    const [question, setQuestion] = useState('');
    const [conversation, setConversation] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const conversationEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const userQuestion = question.trim();
        if (!userQuestion || isLoading) return;

        setError('');
        setQuestion('');
        setIsLoading(true);
        setConversation(prev => [...prev, { role: 'user', content: userQuestion }]);
        
        const systemInstruction = `You are a helpful and patient tutor for a university student. Your subject of expertise is "${subject}". Explain concepts clearly and concisely. Use simple language and analogies where helpful. Format your answers neatly using markdown (e.g., use bullet points for lists, bold for key terms).`;

        try {
            const response = await askAI(userQuestion, undefined, systemInstruction);
            setConversation(prev => [...prev, { role: 'model', content: response }]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Sorry, I couldn't process that request.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Simple markdown to HTML renderer
    const renderMarkdown = (text: string) => {
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italics
            .replace(/`([^`]+)`/g, '<code class="bg-gray-900 text-yellow-300 px-1 py-0.5 rounded text-sm font-mono">$1</code>') // Inline code
            .replace(/\n\s*-\s*(.*)/g, '<li class="ml-4">$1</li>') // List items
            .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>'); // Wrap lists
        return { __html: html };
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl m-4 h-[80vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                         <SparklesIcon className="w-6 h-6 text-yellow-300" />
                         <div>
                            <h2 className="text-xl font-bold text-white">AI Tutor</h2>
                            <p className="text-sm text-blue-300">Subject: {subject}</p>
                         </div>
                    </div>
                     <button onClick={onClose} className="ml-auto p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto space-y-6">
                    {conversation.length === 0 && !isLoading && (
                        <div className="text-center text-gray-500 pt-16">
                            <p>Ask a question about "{subject}"</p>
                            <p className="text-xs mt-2">e.g., "What are the main concepts?"</p>
                        </div>
                    )}
                    {conversation.map((message, index) => (
                         <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center flex-shrink-0">
                                    <SparklesIcon className="w-5 h-5 text-blue-200" />
                                </div>
                            )}
                            <div className={`max-w-lg p-3 rounded-2xl prose prose-invert text-gray-300 ${
                                message.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-lg' 
                                    : 'bg-gray-700 rounded-bl-lg'
                            }`}>
                                <div dangerouslySetInnerHTML={renderMarkdown(message.content)} />
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center flex-shrink-0">
                                <SparklesIcon className="w-5 h-5 text-blue-200" />
                            </div>
                            <div className="p-3 rounded-2xl bg-gray-700 rounded-bl-lg">
                                <TypingIndicator />
                            </div>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    <div ref={conversationEndRef} />
                </main>

                <footer className="flex-shrink-0 p-4 border-t border-gray-700">
                     <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder={`Ask about ${subject}...`}
                            className="w-full bg-gray-700 border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" disabled={isLoading || !question.trim()} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600">
                            {isLoading ? <LoadingSpinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};
