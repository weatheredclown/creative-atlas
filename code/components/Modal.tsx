
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClassName = 'max-w-lg' }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (target instanceof Element && target.closest('[data-modal-ignore="true"]')) {
        return;
      }

      if (modalRef.current && target && !modalRef.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !isClient) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isClient, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const clampOffset = useCallback(
    (offsetX: number, offsetY: number, width: number, height: number) => {
      if (typeof window === 'undefined') {
        return { x: offsetX, y: offsetY };
      }

      const margin = 16;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const halfWidth = width / 2;
      const halfHeight = height / 2;

      let minCenterX = margin + halfWidth;
      let maxCenterX = viewportWidth - margin - halfWidth;

      if (minCenterX > maxCenterX) {
        minCenterX = viewportWidth / 2;
        maxCenterX = viewportWidth / 2;
      }

      let minCenterY = margin + halfHeight;
      let maxCenterY = viewportHeight - margin - halfHeight;

      if (minCenterY > maxCenterY) {
        minCenterY = viewportHeight / 2;
        maxCenterY = viewportHeight / 2;
      }

      const desiredCenterX = viewportWidth / 2 + offsetX;
      const desiredCenterY = viewportHeight / 2 + offsetY;

      const clampedCenterX = Math.min(Math.max(desiredCenterX, minCenterX), maxCenterX);
      const clampedCenterY = Math.min(Math.max(desiredCenterY, minCenterY), maxCenterY);

      return {
        x: clampedCenterX - viewportWidth / 2,
        y: clampedCenterY - viewportHeight / 2,
      };
    },
    []
  );

  useEffect(() => {
    if (!isOpen || !isClient) {
      return;
    }

    const handleResize = () => {
      if (!modalRef.current) {
        return;
      }

      const rect = modalRef.current.getBoundingClientRect();
      setOffset((current) => clampOffset(current.x, current.y, rect.width, rect.height));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [clampOffset, isClient, isOpen]);

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !modalRef.current) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && target.closest('button')) {
        return;
      }

      const rect = modalRef.current.getBoundingClientRect();
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        initialOffsetX: offset.x,
        initialOffsetY: offset.y,
        width: rect.width,
        height: rect.height,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [offset.x, offset.y]
  );

  const handleDragMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;

      const nextOffset = clampOffset(
        dragState.current.initialOffsetX + deltaX,
        dragState.current.initialOffsetY + deltaY,
        dragState.current.width,
        dragState.current.height
      );

      setOffset(nextOffset);
    },
    [clampOffset]
  );

  const handleDragEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
      return;
    }

    dragState.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  if (!isOpen || !isClient) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClassName} m-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-2xl transition-all`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div
          className="flex justify-between items-center p-4 border-b border-slate-700 cursor-move select-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <h2 id="modal-title" className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full p-1 transition-colors cursor-pointer"
            aria-label="Close modal"
            title="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
