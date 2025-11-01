import React from 'react';
import Modal from './Modal';
import { CheckCircleIcon } from './Icons';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-slate-300">{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
          >
            Okay
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InfoModal;
