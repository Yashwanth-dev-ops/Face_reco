import React, { useState, useRef, useEffect } from 'react';
import { KnowledgeDocument } from '../types';
import { SparklesIcon } from './SparklesIcon';
import { SourceViewerModal } from './SourceViewerModal';

interface RAGKnowledgeBasePanelProps {
    onQuery: (query: string) => Promise<{ answer: string; sources: KnowledgeDocument[] }>;
}

interface ChatHistory {
    question: string;
    answer: string;
    sources: KnowledgeDocument[];
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1.5">
        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse"></div>
    </div>
);

export const RAGKnowledgeBasePanel: React.FC<RAGKnowledgeBasePanelProps> = ({ onQuery }) => {
    const [history, setHistory] = useState<ChatHistory[]>([]);
    const [currentQuery, setCurrentQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [viewingSource, setViewingSource] = useState<KnowledgeDocument | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [history, isLoading]);

    const handleSubmit = async (query: string) => {
        if (!query.trim() || isLoading) return;
        
        setError('');
        setCurrentQuery('');
        setIsLoading(true);
        
        try {
            const { answer, sources } = await onQuery(query);
            setHistory(prev => [...prev, { question: query, answer, sources }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExampleClick = (query: string) => {
        setCurrentQuery(query);
        handleSubmit(query);
    };

    const renderMarkdown = (text: string) => {
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\s*-\s*(.*)/g, '<li class="ml-4">$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>');
        return { __html: html };
    };

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 h-[75vh] flex flex-col p-4">
            {viewingSource && <SourceViewerModal document={viewingSource} onClose={() => setViewingSource(null)} />}
            
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                {history.length === 0 && !isLoading && (
                    <div className="text-center text-gray-400 h-full flex flex-col justify-center items-center">
                        <SparklesIcon className="w-16 h-16 text-gray-600" />
                        <h2 className="text-xl font-bold text-white mt-4">University Knowledge Base</h2>
                        <p className="mt-2 max-w-md">Ask questions about university policies, schedules, and rules. The AI will answer based on official documents.</p>
                        <div className="mt-6 space-y-2">
                            <p className="text-sm">Try asking:</p>
                            <button onClick={() => handleExampleClick("What is the attendance policy?")} className="text-sm text-blue-400 hover:underline">"What is the attendance policy?"</button><br/>
                            <button onClick={() => handleExampleClick("When are the mid-term exams?")} className="text-sm text-blue-400 hover:underline">"When are the mid-term exams?"</button><br/>
                            <button onClick={() => handleExampleClick("What are the library hours?")} className="text-sm text-blue-400 hover:underline">"What are the library hours?"</button>
                        </div>
                    </div>
                )}
                
                <div className="space-y-6">
                    {history.map((entry, index) => (
                        <div key={index} className="space-y-4">
                            {/* User Question */}
                            <div className="flex justify-end">
                                <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-lg max-w-lg">
                                    {entry.question}
                                </div>
                            </div>
                            {/* AI Answer */}
                            <div className="flex justify-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0">
                                    <SparklesIcon className="w-5 h-5 text-indigo-200" />
                                </div>
                                <div className="bg-gray-700 p-4 rounded-2xl rounded-bl-lg max-w-xl">
                                    <div className="prose prose-sm prose-invert text-gray-300" dangerouslySetInnerHTML={renderMarkdown(entry.answer)} />
                                    {entry.sources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-600">
                                            <h4 className="text-xs font-bold text-gray-400 mb-2">SOURCES:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {entry.sources.map(source => (
                                                    <button key={source.id} onClick={() => setViewingSource(source)} className="text-xs bg-gray-600/70 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-md transition-colors">
                                                        {source.title}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0">
                                <SparklesIcon className="w-5 h-5 text-indigo-200" />
                            </div>
                            <div className="bg-gray-700 p-3 rounded-2xl rounded-bl-lg">
                                <TypingIndicator />
                            </div>
                        </div>
                    )}
                    {error && <p className="text-red-400 text-center">{error}</p>}
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(currentQuery); }} className="flex-shrink-0 pt-4 border-t border-gray-700/50 flex items-center gap-2">
                <input
                    type="text"
                    value={currentQuery}
                    onChange={e => setCurrentQuery(e.target.value)}
                    placeholder="Ask about university rules, schedules, etc..."
                    className="w-full bg-gray-700 border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" disabled={isLoading} className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-500 disabled:bg-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
};