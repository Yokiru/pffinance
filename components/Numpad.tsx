
import React from 'react';

interface NumpadProps {
    onInput: (value: string) => void;
    onBackspace: () => void;
}

const Numpad: React.FC<NumpadProps> = ({ onInput, onBackspace }) => {
    const keys = [
        { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' },
        { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' },
        { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' },
        { label: '000', value: '000' }, { label: '0', value: '0' }
    ];

    return (
        <div className="grid grid-cols-3 gap-3">
            {keys.map((key) => (
                <button 
                    key={key.label} 
                    onClick={() => onInput(key.value)}
                    className="h-12 text-xl font-medium bg-gray-100 rounded-2xl text-gray-900 hover:bg-gray-200 flex items-center justify-center"
                >
                    {key.label}
                </button>
            ))}
            <button 
                onClick={onBackspace}
                className="h-12 text-xl font-medium bg-gray-100 rounded-2xl text-gray-900 hover:bg-gray-200 flex justify-center items-center"
                aria-label="Backspace"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l-6 6" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9l6 6" />
                </svg>
            </button>
        </div>
    );
};

export default Numpad;
