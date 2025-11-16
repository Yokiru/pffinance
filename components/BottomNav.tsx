
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
      // Menggunakan Google Material Icon "Dashboard" (SVG Code)
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4 13h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zm0 8h6c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1zm10 0h6c.55 0 1-.45 1-1v-8c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zM13 4v4c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1z"/></svg>
    },
    {
      id: 'customers',
      label: 'Nasabah',
      // Menggunakan Google Material Icon "Group" (SVG Code) sesuai permintaan
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
    },
    {
      id: 'savings',
      label: 'Tabungan',
      // Menggunakan Google Material Icon "Account Balance Wallet" (SVG Code)
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
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
