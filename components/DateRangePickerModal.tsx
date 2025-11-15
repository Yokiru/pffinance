
import React, { useState, useMemo, useEffect } from 'react';
import { DateRange } from '../App';
import Modal from './Modal';

interface DateRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRange: DateRange;
  onApply: (range: DateRange) => void;
}

const DateRangePickerModal: React.FC<DateRangePickerModalProps> = ({ isOpen, onClose, currentRange, onApply }) => {
  const [viewDate, setViewDate] = useState(currentRange.end);
  const [selectedStart, setSelectedStart] = useState<Date | null>(currentRange.start);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(currentRange.end);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStart(currentRange.start);
      setSelectedEnd(currentRange.end);
      setViewDate(currentRange.end);
    }
  }, [isOpen, currentRange]);

  const handleDayClick = (day: Date) => {
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(day);
      setSelectedEnd(null);
    } else {
      if (day < selectedStart) {
        setSelectedEnd(selectedStart);
        setSelectedStart(day);
      } else {
        setSelectedEnd(day);
      }
    }
  };

  const changeMonth = (amount: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const handleApply = () => {
    if (selectedStart) {
      onApply({
        start: selectedStart,
        end: selectedEnd || selectedStart, // If only start is selected, use it for end as well
      });
      onClose();
    }
  };

  const { monthName, year, days, leadingDays, trailingDays } = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const monthName = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const daysArr = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const leadingDaysArr = Array.from({ length: firstDayOfMonth }, (_, i) => new Date(year, month, i - firstDayOfMonth + 1));
    
    const remainingGridCells = 42 - (daysArr.length + leadingDaysArr.length);
    const trailingDaysArr = Array.from({ length: remainingGridCells }, (_, i) => new Date(year, month + 1, i + 1));

    return { monthName, year, days: daysArr, leadingDays: leadingDaysArr, trailingDays: trailingDaysArr };
  }, [viewDate]);

  const renderDay = (day: Date, isCurrentMonth: boolean) => {
    const dateString = day.toDateString();
    const isStartDate = selectedStart?.toDateString() === dateString;
    const isEndDate = selectedEnd?.toDateString() === dateString;
    const isInRange = selectedStart && (selectedEnd || hoverDate) && day > selectedStart && day < (selectedEnd || hoverDate!);
    const isHovered = hoverDate?.toDateString() === dateString;

    let classes = 'w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-150';
    if (!isCurrentMonth) {
      classes += ' text-gray-300';
    } else {
      classes += ' text-gray-900 cursor-pointer';

      if (isStartDate || isEndDate) {
        classes += ' bg-black text-white font-bold';
      } else if (isInRange) {
        classes += ' bg-gray-200';
      } else if (isHovered && selectedStart && !selectedEnd) {
         classes += ' bg-gray-200';
      } else {
         classes += ' hover:bg-gray-100';
      }
    }

    return (
      <div
        key={day.toISOString()}
        onClick={() => isCurrentMonth && handleDayClick(day)}
        onMouseEnter={() => isCurrentMonth && setHoverDate(day)}
        onMouseLeave={() => setHoverDate(null)}
        className={classes}
      >
        {day.getDate()}
      </div>
    );
  };
  
  const calendarGrid = [...leadingDays, ...days, ...trailingDays];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pilih Rentang Tanggal">
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
        <div className="grid grid-cols-7 gap-y-1">
          {calendarGrid.map((day, index) => renderDay(day, index >= leadingDays.length && index < leadingDays.length + days.length))}
        </div>
        <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-200 transition-all">
                Batal
            </button>
            <button onClick={handleApply} disabled={!selectedStart} className="flex-1 bg-black text-white font-bold py-2 px-4 rounded-xl hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed">
                Terapkan
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default DateRangePickerModal;
