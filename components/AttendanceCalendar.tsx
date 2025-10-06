import React, { useState, useMemo } from 'react';
import { AttendanceRecord } from '../types';

interface AttendanceCalendarProps {
    studentAttendance: AttendanceRecord[];
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);


export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ studentAttendance }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const presentDays = useMemo(() => {
        const dates = new Set<string>();
        studentAttendance.forEach(rec => {
            dates.add(new Date(rec.timestamp).toDateString());
        });
        return dates;
    }, [studentAttendance]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
            // Prevent navigating into the future
            if (newDate > new Date()) {
                return prev;
            }
            return newDate;
        });
    };
    
    const isFutureMonth = currentDate.getFullYear() > new Date().getFullYear() || 
                         (currentDate.getFullYear() === new Date().getFullYear() && currentDate.getMonth() >= new Date().getMonth());

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.push(<div key={`blank-${i}`} className="p-2"></div>);
        }

        const today = new Date();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            const isPresent = presentDays.has(date.toDateString());
            const isPast = date < today && !isToday;
            const isFuture = date > today;

            let dayClass = "w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 text-sm";
            
            if (isToday) {
                dayClass += isPresent
                    ? " bg-green-500 text-white font-bold ring-2 ring-green-400"
                    : " bg-blue-600 text-white font-bold ring-2 ring-blue-500";
            } else if (isPresent) {
                dayClass += " bg-green-500/30 text-green-300";
            } else if (isPast) {
                 dayClass += " text-gray-600 line-through";
            } else if(isFuture) {
                dayClass += " text-gray-700";
            }
             else {
                dayClass += " text-gray-300";
            }
            
            grid.push(
                <div key={day} className={dayClass}>
                    {day}
                </div>
            );
        }

        return grid;
    };
    
    return (
        <div className="bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white">
                    <ChevronLeftIcon />
                </button>
                <h4 className="font-bold text-lg text-white">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h4>
                <button onClick={() => changeMonth(1)} disabled={isFutureMonth} className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                    <ChevronRightIcon />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-gray-400 mb-2">
                {daysOfWeek.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-2 place-items-center">
                {renderCalendarGrid()}
            </div>
        </div>
    );
};