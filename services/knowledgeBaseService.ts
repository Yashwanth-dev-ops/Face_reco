import { KnowledgeDocument } from '../types';

// This acts as our simulated vector database or document store.
const KNOWLEDGE_BASE: KnowledgeDocument[] = [
    {
        id: 'doc_attendance_policy',
        title: 'University Attendance Policy',
        content: `The official university policy mandates a minimum of 75% attendance in all theory and practical subjects to be eligible for the final examinations. Students falling below this threshold will be detained from the examination and will have to repeat the course. Condonation for attendance shortages may be granted by the Principal on medical grounds, up to a maximum of 10%, provided valid medical certificates are submitted within a week of returning to college.`,
        keywords: ['attendance', 'policy', 'minimum', '75%', 'condonation', 'medical', 'detained', 'examination'],
    },
    {
        id: 'doc_exam_schedule_2024',
        title: 'Examination Schedule - November 2024',
        content: `The schedule for the second mid-term examinations for the academic year 2024-2025 is as follows:
        - 2nd Year CSE & ECE: Commencing from November 15th, 2024.
        - 3rd Year All Departments: Commencing from November 18th, 2024.
        - Final practical examinations for all departments will be held in the first week of December.
        Detailed timetables will be posted on the department notice boards.`,
        keywords: ['exam', 'schedule', 'mid-term', 'mid 2', 'november', '2024', 'cse', 'ece', 'practical'],
    },
    {
        id: 'doc_library_rules',
        title: 'Central Library Rules and Regulations',
        content: `The Central Library is open from 9:00 AM to 8:00 PM on all working days. On Saturdays, the library functions from 9:00 AM to 2:00 PM. A maximum of 4 books can be borrowed by a student at a time for a period of 15 days. A fine of Rs. 5 per day will be levied on overdue books. Reference books and journals cannot be issued and must be consulted within the library premises.`,
        keywords: ['library', 'rules', 'timings', 'open', 'books', 'borrow', 'fine', 'overdue'],
    },
    {
        id: 'doc_ragging_policy',
        title: 'Anti-Ragging Policy',
        content: `Ragging in any form is strictly prohibited within and outside the university campus. Any student found guilty of ragging will be subject to disciplinary action, which may include suspension, expulsion from the hostel, or rustication from the university. An Anti-Ragging Committee is in place to address any complaints. Students can report incidents to their department HOD or any member of the committee.`,
        keywords: ['ragging', 'anti-ragging', 'prohibited', 'discipline', 'suspension', 'rustication', 'committee'],
    },
];

/**
 * Simulates retrieving relevant documents from a knowledge base.
 * This function performs a simple keyword-based search on the title, content, and keywords.
 * @param query The user's search query.
 * @returns An array of relevant KnowledgeDocument objects.
 */
export const retrieveDocuments = (query: string): KnowledgeDocument[] => {
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(word => word.length > 2));
    
    const scoredDocs: { doc: KnowledgeDocument, score: number }[] = KNOWLEDGE_BASE.map(doc => {
        let score = 0;
        const contentLower = doc.content.toLowerCase();
        const titleLower = doc.title.toLowerCase();

        queryWords.forEach(word => {
            if (titleLower.includes(word)) {
                score += 3; // Higher weight for title match
            }
            if (contentLower.includes(word)) {
                score += 1;
            }
            if (doc.keywords.some(kw => kw.toLowerCase().includes(word))) {
                score += 2; // Medium weight for keyword match
            }
        });

        return { doc, score };
    });

    // Filter out docs with no score and sort by score
    return scoredDocs
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3) // Return top 3 relevant documents
        .map(item => item.doc);
};
