
import React from 'react';

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
    <path fillRule='evenodd' d='M10.868 2.884c.321-.772 1.415-.772 1.736 0l1.681 4.06c.064.155.19.284.348.348l4.06 1.681c.772.321.772 1.415 0 1.736l-4.06 1.681a.5.5 0 00-.348.348l-1.681 4.06c-.321.772-1.415-.772-1.736 0l-1.681-4.06a.5.5 0 00-.348-.348l-4.06-1.681c-.772-.321-.772-1.415 0-1.736l4.06-1.681a.5.5 0 00.348-.348l1.681-4.06zM10 15.5a.5.5 0 01.5-.5h.01a.5.5 0 01.5.5v.01a.5.5 0 01-.5.5h-.01a.5.5 0 01-.5-.5v-.01z' clipRule='evenodd' />
  </svg>
);

export const BookOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
    <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
  </svg>
);

export const CubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
    <path d='M10 3.5a1.5 1.5 0 011.5 1.5v1.5h-3V5A1.5 1.5 0 0110 3.5zM8.5 8.5v5.5a1.5 1.5 0 001.5 1.5h.01a1.5 1.5 0 001.5-1.5V8.5h-3zM5 6.5a1.5 1.5 0 011.5-1.5h1.5v10H6.5A1.5 1.5 0 015 15V6.5zM13.5 5a1.5 1.5 0 011.5 1.5v8.5a1.5 1.5 0 01-1.5 1.5h-1.5V5h1.5z' />
  </svg>
);

export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' className={className}>
    <path d='M23.52 12.2727C23.52 11.4182 23.4418 10.5864 23.2964 9.77734H12V14.4955H18.4582C18.1786 15.9955 17.3373 17.2727 16.0609 18.1273V21.2727H19.8964C22.1973 19.1545 23.52 15.9818 23.52 12.2727Z' fill='#4285F4'/>
    <path d='M12 24C15.24 24 17.9564 22.9255 19.8964 21.2727L16.0609 18.1273C15.0082 18.8373 13.6345 19.2727 12 19.2727C8.88636 19.2727 6.255 17.1327 5.31682 14.2954H1.34182V17.54C3.27091 21.5182 7.33455 24 12 24Z' fill='#34A853'/>
    <path d='M5.31682 14.2955C5.08 13.5855 4.94364 12.8255 4.94364 12.0455C4.94364 11.2654 5.08 10.5054 5.30591 9.79543V6.55182H1.34182C0.486364 8.18545 0 10.0582 0 12.0455C0 14.0327 0.486364 15.9054 1.34182 17.5391L5.31682 14.2955Z' fill='#FBBC05'/>
    <path d='M12 4.72727C13.7955 4.72727 15.375 5.34545 16.6214 6.52727L19.9841 3.16455C17.9455 1.27273 15.24 0 12 0C7.33455 0 3.27091 2.48182 1.34182 6.46091L5.30591 9.79545C6.255 6.95818 8.88636 4.72727 12 4.72727Z' fill='#EA4335'/>
  </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
    <path d='M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z' />
  </svg>
);

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
  </svg>
);

export const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z' clipRule='evenodd' />
    </svg>
);

export const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M15.5 2.5a3 3 0 00-5.84-.773.5.5 0 01-.82 0 3 3 0 00-5.84.774A.5.5 0 013 3V3.5a.5.5 0 01.5.5v1a.5.5 0 01-.5.5V6a.5.5 0 01.5.5v1a.5.5 0 01-.5.5V8.5a.5.5 0 01.5.5v1a.5.5 0 01-.5.5V11a.5.5 0 01.5.5v1a.5.5 0 01-.5.5V13a.5.5 0 01.5.5v1a.5.5 0 01-.5.5V15.5a.5.5 0 01.5.5v.5h13v-.5a.5.5 0 01.5-.5V15a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5V12a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5V9a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5V6a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5V3a.5.5 0 01-.5-.5z' />
    </svg>
);

export const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.665l3-3z' />
        <path d='M8.603 15.117a.75.75 0 00-1.06-1.06l-1.225 1.224a2.5 2.5 0 01-3.536-3.536l3-3a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.06 1.06l1.225-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 005.656 5.656l1.224-1.225a.75.75 0 00-1.06-1.06l-1.224 1.224z' />
    </svg>
);

export const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M13 4.5a2.5 2.5 0 11.75.75A.75.75 0 0015.5 6a4 4 0 10-5.207 3.536.75.75 0 001.293.755A2.5 2.5 0 1113 4.5zM3.75 7.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z' />
    </svg>
);

export const TableCellsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M7.25 3.75A.75.75 0 006.5 4.5v11a.75.75 0 001.5 0v-11a.75.75 0 00-.75-.75zM12.75 3.75a.75.75 0 00-.75.75v11a.75.75 0 001.5 0v-11a.75.75 0 00-.75-.75zM3.5 6.25a.75.75 0 000 1.5h13a.75.75 0 000-1.5h-13zM3.5 12.25a.75.75 0 000 1.5h13a.75.75 0 000-1.5h-13z' />
    </svg>
);

export const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z' />
        <path d='M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z' />
    </svg>
);

export const ViewColumnsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path fillRule='evenodd' d='M2 3.5A1.5 1.5 0 013.5 2h13A1.5 1.5 0 0118 3.5v13a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 16.5v-13zM3.5 4a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h4v-12h-4zM9 4v12h7.5a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5H9z' clipRule='evenodd' />
    </svg>
);

export const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z' clipRule='evenodd' />
    </svg>
);

export const GlobeAltIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM5.207 5.207a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM14.854 6.268a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM10 15.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM4.146 13.732a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM15.914 14.793a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 10a8 8 0 1116 0 8 8 0 01-16 0z' />
    </svg>
);

export const ArrowUpTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M9.25 2.75a.75.75 0 011.5 0v8.614l2.955-3.13a.75.75 0 111.09 1.03l-4.25 4.5a.75.75 0 01-1.09 0l-4.25-4.5a.75.75 0 111.09-1.03l2.955 3.13V2.75z' />
        <path d='M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z' />
    </svg>
);

export const MegaphoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M3.762 4.15a1 1 0 00-1.512.858v9.983a1 1 0 001.512.858L8 12.273v3.977a1 1 0 001.657.753l1.92-1.706a.5.5 0 00.05-.045L13.172 13H15.5a2.5 2.5 0 002.5-2.5V9.5A2.5 2.5 0 0015.5 7h-1.793l-1.545-2.252a.5.5 0 00-.05-.045l-1.92-1.706A1 1 0 009 3.244v3.03L3.762 4.15zM17 9.5v1a1 1 0 01-1 1h-2.172a1 1 0 00-.736.32l-1.683 1.82-.409.364v-8.03l.41.365 1.682 1.82a1 1 0 00.736.32H16a1 1 0 011 1z' />
    </svg>
);

export const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path fillRule='evenodd' d='M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.27.61-.474l.21-.202a.75.75 0 00-1.06-1.06l-.21.202-.016.015a1.5 1.5 0 01-1.42 0l-.016-.015-.21-.202a.75.75 0 00-1.06 1.06l.21.202c.21.203.424.373.61.474.093.048.19.095.281.14l.018.008.006.003zM10 1.75a.75.75 0 01.75.75v.536l.003.001a5.741 5.741 0 01.281.14c.186.1.4.27.61.474l.21.202a.75.75 0 01-1.06 1.06l-.21-.202-.016-.015a1.5 1.5 0 00-1.42 0l-.016.015-.21.202a.75.75 0 11-1.06-1.06l.21-.202c.21-.203.424-.373.61-.474a5.741 5.741 0 01.28-.14l.004-.001V2.5a.75.75 0 01.75-.75z' clipRule='evenodd' />
        <path d='M10 4a4 4 0 100 8 4 4 0 000-8zM6.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z' />
    </svg>
);

export const BuildingStorefrontIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M10.5 2.75a.75.75 0 00-1 0V3.5h-2V2.75a.75.75 0 00-1.5 0V3.5h-1a.75.75 0 000 1.5h1v1.5h-1a.75.75 0 000 1.5h1v1.5h-1a.75.75 0 000 1.5h1V12h-1a.75.75 0 000 1.5h1v.25a.75.75 0 001.5 0V13.5h2v.25a.75.75 0 001.5 0V13.5h1a.75.75 0 000-1.5h-1V10.5h1a.75.75 0 000-1.5h-1V7.5h1a.75.75 0 000-1.5h-1V3.5a.75.75 0 00-1-.75h-2V2.75z' />
        <path fillRule='evenodd' d='M3 4.75A2.75 2.75 0 015.75 2h8.5A2.75 2.75 0 0117 4.75v10.5A2.75 2.75 0 0114.25 18h-8.5A2.75 2.75 0 013 15.25V4.75zm2.75-.25a1.25 1.25 0 00-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V4.75c0-.69-.56-1.25-1.25-1.25h-8.5z' clipRule='evenodd' />
    </svg>
);

export const FolderPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M3.75 3A1.75 1.75 0 002 4.75v1.265a.75.75 0 001.5 0V4.75c0-.138.112-.25.25-.25h3.54a.75.75 0 01.6.3l.433.866A.75.75 0 008.9 6h2.2a.75.75 0 00.6-.3l.433-.866a.75.75 0 01.6-.3h3.54c.138 0 .25.112.25.25v8.5a.25.25 0 01-.25.25h-3.265a.75.75 0 000 1.5h3.265A1.75 1.75 0 0018 13.25v-8.5A1.75 1.75 0 0016.25 3H3.75z' />
        <path d='M10 10.5a.75.75 0 00-1.5 0v1.25H7.25a.75.75 0 000 1.5H8.5V14.5a.75.75 0 001.5 0v-1.25H11.25a.75.75 0 000-1.5H10V10.5z' />
        <path d='M2 10.75a.75.75 0 00-1.5 0v4.5A1.75 1.75 0 002.25 17h5a.75.75 0 000-1.5h-5a.25.25 0 01-.25-.25v-4.5z' />
    </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
    <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.24 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clipRule='evenodd' />
  </svg>
);

export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M6 2.75a.75.75 0 00-1.5 0V4H3.5A1.5 1.5 0 002 5.5v11A1.5 1.5 0 003.5 18h13a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0016.5 4H15V2.75a.75.75 0 00-1.5 0V4h-7V2.75z' />
        <path d='M3.5 7.75a.75.75 0 01.75-.75h11a.75.75 0 010 1.5h-11a.75.75 0 01-.75-.75zM6.75 10a.75.75 0 000 1.5h1.5A.75.75 0 009 10h-.007A.75.75 0 006.75 10zm0 3a.75.75 0 000 1.5h1.5A.75.75 0 009 13h-.007A.75.75 0 006.75 13zm4-3a.75.75 0 000 1.5h1.5a.75.75 0 00.75-.75h-.007A.75.75 0 0010.75 10zm0 3a.75.75 0 000 1.5h1.5a.75.75 0 00.75-.75h-.007A.75.75 0 0010.75 13z' />
    </svg>
);

export const MagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path fillRule='evenodd' d='M9 3.5a5.5 5.5 0 014.356 8.89l2.932 2.932a.75.75 0 11-1.06 1.06l-2.932-2.932A5.5 5.5 0 119 3.5zm0 1.5a4 4 0 100 8 4 4 0 000-8z' clipRule='evenodd' />
    </svg>
);

export const FlagIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path fillRule='evenodd' d='M3.75 2A.75.75 0 013 2.75v14.5a.75.75 0 001.5 0v-4.03c.399-.186.84-.22 1.276-.087l.805.241c1.172.351 2.42.267 3.545-.238a4.978 4.978 0 012.716-.357l2.05.341A.75.75 0 0015.75 12V3.25a.75.75 0 00-.88-.737l-2.477.413a4.478 4.478 0 01-2.506.327l-1.28-.256A5.977 5.977 0 005.5 3.5a4.5 4.5 0 01-1.75-.35V2.75A.75.75 0 013.75 2z' clipRule='evenodd' />
    </svg>
);

export const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className={className}>
        <path d='M17.28 10.22l-6.5-6.5A1.75 1.75 0 009.54 3H4.25A1.75 1.75 0 002.5 4.75v5.29c0 .464.184.91.513 1.237l6.5 6.5a1.75 1.75 0 002.474 0l5.293-5.293a1.75 1.75 0 000-2.474z' />
        <path d='M6.25 7.5a1.25 1.25 0 111.5-2 1.25 1.25 0 01-1.5 2z' />
    </svg>
);
