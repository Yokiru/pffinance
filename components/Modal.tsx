
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentClassName?: string;
  headerAction?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, contentClassName = 'p-6', headerAction }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0 bg-card z-10">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            {headerAction && (
                <div className="flex items-center">
                    {headerAction}
                </div>
            )}
          </div>
        )}
        <div className={`${contentClassName} overflow-y-auto`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
