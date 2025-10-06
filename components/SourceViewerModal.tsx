import React from 'react';
import { KnowledgeDocument } from '../types';

export const SourceViewerModal: React.FC<{ document: KnowledgeDocument; onClose: () => void }> = ({ document, onClose }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-full max-w-2xl m-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">{document.title}</h3>
            <div className="flex-grow overflow-y-auto pr-2 text-gray-300 whitespace-pre-wrap leading-relaxed">
                {document.content}
            </div>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 rounded-lg self-end">Close</button>
        </div>
    </div>
);
