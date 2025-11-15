
import React from 'react';
import { Page } from '../App';

interface BottomNavProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  onAddClick: () => void;
  isVisible: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage, onAddClick, isVisible }) => {
  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    },
    {
      id: 'customers',
      label: 'Nasabah',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    },
    {
      id: 'savings',
      label: 'Tabungan',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
    }
  ];

  if (!isVisible) {
    return null;
  }
  
  const isFabActive = activePage === 'customers' || activePage === 'savings';

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto z-50 flex items-center gap-3">
      <div className="bg-black rounded-full flex justify-around items-center p-2 shadow-2xl space-x-2">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center justify-center gap-2 py-2 rounded-full transition-all duration-300 ease-in-out ${isActive ? 'bg-white text-black px-6' : 'text-gray-400 hover:text-white w-12'}`}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
              {isActive && <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </div>
      <button
        onClick={onAddClick}
        disabled={!isFabActive}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all transform ${
            isFabActive 
            ? 'bg-[#C7FF24] text-black hover:scale-105'
            : 'bg-gray-300 text-white cursor-not-allowed opacity-50'
        }`}
        aria-label="Tambah"
        title={activePage === 'customers' ? 'Tambah Nasabah' : activePage === 'savings' ? 'Tambah Tabungan' : 'Aksi tidak tersedia'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </nav>
  );
};

export default BottomNav;
