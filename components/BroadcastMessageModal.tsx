import React, { useState, useEffect, useMemo } from 'react';
import { Year, AdminInfo, Designation } from '../types';

interface BroadcastMessageModalProps {
    departments: string[];
    currentUser: AdminInfo;
    onClose: () => void;
    onSendBroadcast: (target: string, title: string, message: string) => Promise<void>;
}

export const BroadcastMessageModal: React.FC<BroadcastMessageModalProps> = ({ departments, currentUser, onClose, onSendBroadcast }) => {
    const isHighPrivilege = [Designation.Principal, Designation.VicePrincipal, Designation.Chairman].includes(currentUser.designation);
    const isIncharge = currentUser.designation === Designation.Incharge;

    const [step, setStep] = useState<'initial' | 'form'>(isHighPrivilege ? 'initial' : 'form');
    const [broadcastType, setBroadcastType] = useState<'students' | 'staff'>('students');
    const [staffTarget, setStaffTarget] = useState<'department' | 'hods'>('department');
    
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    
    // Academic departments for dropdowns
    const academicDepartments = useMemo(() => departments.filter(d => d !== 'Administration'), [departments]);

    // Student filters state initialization
    const [studentDept, setStudentDept] = useState(isHighPrivilege ? 'ALL' : currentUser.department);
    const [studentYear, setStudentYear] = useState(isIncharge && currentUser.year ? currentUser.year : 'ALL');
    const [studentSection, setStudentSection] = useState(isIncharge && currentUser.section && currentUser.section !== 'All Sections' ? currentUser.section : 'ALL');

    // Staff filters state initialization
    const [staffDept, setStaffDept] = useState('ALL');
    const [hodDept, setHodDept] = useState('ALL');

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isHighPrivilege) {
            setBroadcastType('students');
            setStudentDept(currentUser.department);
            if (isIncharge) {
                if (currentUser.year) setStudentYear(currentUser.year);
                if (currentUser.section && currentUser.section !== 'All Sections') setStudentSection(currentUser.section);
            }
        }
    }, [currentUser, isHighPrivilege, isIncharge]);


    const handleSelectType = (type: 'students' | 'staff') => {
        setBroadcastType(type);
        setStep('form');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            return;
        }

        setIsLoading(true);

        let target = '';
        if (broadcastType === 'students') {
            if (studentDept === 'ALL') {
                target = 'STUDENT_ALL';
            } else {
                target = `STUDENT_DEPT_${studentDept}`;
                if (studentYear !== 'ALL') {
                    target += `_YEAR_${studentYear.replace(/ /g, '-')}`;
                    if (studentSection !== 'ALL') {
                        target += `_SEC_${studentSection}`;
                    }
                }
            }
        } else { // Staff broadcast (only for high privilege)
            if (staffTarget === 'department') {
                target = staffDept === 'ALL' ? 'STAFF_ALL' : `STAFF_DEPT_${staffDept}`;
            } else { // HODs
                target = hodDept === 'ALL' ? 'HOD_ALL' : `HOD_DEPT_${hodDept}`;
            }
        }
        
        try {
            await onSendBroadcast(target, title, message);
            onClose();
        } catch (err) {
            // Error toast is handled by the parent component, just stop loading
            setIsLoading(false);
        }
    };
    
    const renderFormContent = () => (
         <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            {isHighPrivilege && <button type="button" onClick={() => setStep('initial')} className="text-sm text-blue-400 hover:underline mb-2">&larr; Change Audience</button>}

            {!isHighPrivilege && (
                <div className="bg-yellow-900/40 border border-yellow-700/60 text-yellow-200 p-3 rounded-lg text-sm mb-4">
                    <p>As a <span className="font-bold">{currentUser.designation}</span>, you can broadcast only to students within your assigned scope.</p>
                </div>
            )}
            
            {(broadcastType === 'students' || !isHighPrivilege) && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Student Audience</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-gray-900/50 rounded-lg">
                        <select value={studentDept} onChange={e => setStudentDept(e.target.value)} disabled={!isHighPrivilege} className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                           {isHighPrivilege ? (
                               <>
                                <option value="ALL">All Departments</option>
                                {academicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                               </>
                           ) : (
                                <option value={currentUser.department}>{currentUser.department}</option>
                           )}
                        </select>
                        <select value={studentYear} onChange={e => setStudentYear(e.target.value)} disabled={studentDept === 'ALL' || (isIncharge && !!currentUser.year)} className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {isIncharge && currentUser.year ? (
                               <option value={currentUser.year}>{currentUser.year}</option>
                            ) : (
                                <>
                                 <option value="ALL">All Years</option>
                                 {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                                </>
                            )}
                        </select>
                        <select value={studentSection} onChange={e => setStudentSection(e.target.value)} disabled={studentYear === 'ALL' || (isIncharge && currentUser.section !== 'All Sections' && !!currentUser.section)} className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                             {isIncharge && currentUser.section && currentUser.section !== 'All Sections' ? (
                               <option value={currentUser.section}>Section {currentUser.section}</option>
                            ) : (
                                <>
                                    <option value="ALL">All Sections</option>
                                    {['1', '2', '3', '4'].map(s => <option key={s} value={s}>Section {s}</option>)}
                                </>
                            )}
                        </select>
                    </div>
                </div>
            )}
            
            {broadcastType === 'staff' && isHighPrivilege && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Staff Audience</label>
                     <div className="flex bg-gray-900/50 p-1 rounded-lg mb-2">
                        <button type="button" onClick={() => setStaffTarget('department')} className={`flex-1 py-1 font-semibold transition-colors rounded-md text-xs ${staffTarget === 'department' ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Department Staff</button>
                        <button type="button" onClick={() => setStaffTarget('hods')} className={`flex-1 py-1 font-semibold transition-colors rounded-md text-xs ${staffTarget === 'hods' ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>HODs</button>
                    </div>
                    {staffTarget === 'department' ? (
                         <select value={staffDept} onChange={e => setStaffDept(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white text-sm">
                            <option value="ALL">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    ) : (
                         <select value={hodDept} onChange={e => setHodDept(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white text-sm">
                            <option value="ALL">All HODs</option>
                            {academicDepartments.map(d => <option key={d} value={d}>{d} HOD</option>)}
                        </select>
                    )}
                </div>
            )}
            
            <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message here..." rows={4} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50">
                    {isLoading ? 'Sending...' : 'Send Broadcast'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">Send Broadcast Message</h2>
                
                {step === 'initial' && isHighPrivilege ? (
                    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
                        <button onClick={() => handleSelectType('students')} className="flex-1 p-6 text-center bg-blue-900/40 border border-blue-700 rounded-lg hover:bg-blue-800/60 transition-colors">
                            <span className="text-4xl">🎓</span>
                            <p className="mt-2 font-bold text-lg text-white">To Students</p>
                        </button>
                        <button onClick={() => handleSelectType('staff')} className="flex-1 p-6 text-center bg-indigo-900/40 border border-indigo-700 rounded-lg hover:bg-indigo-800/60 transition-colors">
                            <span className="text-4xl">👥</span>
                            <p className="mt-2 font-bold text-lg text-white">To Staff</p>
                        </button>
                    </div>
                ) : renderFormContent()}
            </div>
        </div>
    );
};
