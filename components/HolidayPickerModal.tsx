
import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { staticHolidays } from '../utils/holidays';

interface HolidayPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customHolidays: string[];
  onUpdateHolidays: (newHolidays: string[]) => void;
}

const HolidayPickerModal: React.FC<HolidayPickerModalProps> = ({ isOpen, onClose, customHolidays, onUpdateHolidays }) => {
  const [viewDate, setViewDate] = useState(new Date());
  // Local state to manage edits before saving
  const [localCustomHolidays, setLocalCustomHolidays] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalCustomHolidays([...customHolidays]);
      setViewDate(new Date());
    }
  }, [isOpen, customHolidays]);

  const toggleDate = (day: Date) => {
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dateVal = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;

    // Check if it's a static holiday (cannot uncheck)
    if (staticHolidays.includes(dateStr)) return;

    setLocalCustomHolidays(prev => {
        if (prev.includes(dateStr)) {
            return prev.filter(d => d !== dateStr);
        } else {
            return [...prev, dateStr];
        }
    });
  };

  const changeMonth = (amount: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const handleSave = () => {
      onUpdateHolidays(localCustomHolidays);
      onClose();
  };

  const { monthName, days, leadingDays, trailingDays } = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const monthName = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const leadingDaysArr = Array.from({ length: firstDayOfMonth }, (_, i) => new Date(year, month, i - firstDayOfMonth + 1));
    
    const remainingGridCells = 42 - (daysArr.length + leadingDaysArr.length);
    const trailingDaysArr = Array.from({ length: remainingGridCells }, (_, i) => new Date(year, month + 1, i + 1));

    return { monthName, days: daysArr, leadingDays: leadingDaysArr, trailingDays: trailingDaysArr };
  }, [viewDate]);

  const renderDay = (day: Date, isCurrentMonth: boolean) => {
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dateVal = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;
    
    const isStatic = staticHolidays.includes(dateStr);
    const isCustom = localCustomHolidays.includes(dateStr);
    const isHoliday = isStatic || isCustom;

    let classes = 'w-10 h-10 flex items-center justify-center rounded-full transition-all duration-150 relative ';
    
    if (!isCurrentMonth) {
      classes += ' text-gray-300';
    } else {
      classes += ' cursor-pointer font-medium';
      if (isStatic) {
         classes += ' bg-gray-200 text-gray-500 cursor-not-allowed';
      } else if (isCustom) {
         classes += ' bg-red-500 text-white shadow-md scale-105';
      } else {
         classes += ' text-gray-900 hover:bg-gray-100';
      }
    }

    return (
      <div
        key={day.toISOString()}
        onClick={() => isCurrentMonth && toggleDate(day)}
        className={classes}
      >
        {day.getDate()}
      </div>
    );
  };
  
  const calendarGrid = [...leadingDays, ...days, ...trailingDays];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atur Hari Libur">
      <div className="flex flex-col">
        
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h4 className="font-bold text-lg text-gray-900">{monthName}</h4>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-gray-400 mb-2">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {calendarGrid.map((day, index) => renderDay(day, index >= leadingDays.length && index < leadingDays.length + days.length))}
        </div>
        
        <div className="flex items-center gap-4 mt-4 px-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Libur (Manual)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <span>Libur Nasional</span>
            </div>
        </div>

        <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-200 transition-all">
                Batal
            </button>
            <button onClick={handleSave} className="flex-1 bg-black text-white font-bold py-2 px-4 rounded-xl hover:bg-gray-800 transition-all">
                Simpan
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default HolidayPickerModal;
    