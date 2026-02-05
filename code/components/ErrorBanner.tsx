import React from 'react';
import { XMarkIcon } from './Icons';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <div className='flex items-start gap-3 rounded-md border border-rose-700/80 bg-rose-950/80 p-4 text-rose-100 shadow-lg'>
      <div className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-800/80 text-rose-100'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 20 20'
          fill='currentColor'
          className='h-4 w-4'
          aria-hidden='true'
        >
          <path
            fillRule='evenodd'
            d='M9.401 1.924a1.25 1.25 0 011.197 0l7 3.889A1.25 1.25 0 0118.5 6.944v6.112a1.25 1.25 0 01-.902 1.131l-7 2.111a1.25 1.25 0 01-.696 0l-7-2.111A1.25 1.25 0 011.5 13.056V6.944a1.25 1.25 0 01.902-1.131l7-3.889zM10 6a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 6zm0 6a.875.875 0 100 1.75.875.875 0 000-1.75z'
            clipRule='evenodd'
          />
        </svg>
      </div>
      <div className='flex-1 text-sm leading-relaxed'>{message}</div>
      {onDismiss && (
        <button
          type='button'
          onClick={onDismiss}
          className='ml-2 rounded-full p-1 text-rose-200 transition-colors hover:bg-rose-800/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300'
          title='Dismiss error'
        >
          <span className='sr-only'>Dismiss error</span>
          <XMarkIcon className='h-4 w-4' />
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
