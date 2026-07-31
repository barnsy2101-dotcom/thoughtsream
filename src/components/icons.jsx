import React from 'react';

export const Icon = ({ d, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);

export const ZapIcon = ({ size=24, className="" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);

export const AlarmIcon = ({ size=24, className="" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2"></path><path d="M5 3L2 6"></path><path d="M19 3l3 3"></path></svg>
);

export const SendIcon    = (p) => <Icon {...p} d={<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>} />;
export const PlusIcon    = (p) => <Icon {...p} d={<><path d="M5 12h14"/><path d="M12 5v14"/></>} />;
export const MinusIcon   = (p) => <Icon {...p} d={<path d="M5 12h14"/>} />;
export const LibraryIcon = (p) => <Icon {...p} d={<><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></>} />;
export const XIcon       = (p) => <Icon {...p} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />;
export const TrashIcon   = (p) => <Icon {...p} d={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>} />;
export const LinkIcon    = (p) => <Icon {...p} d={<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>} />;
export const CopyIcon    = (p) => <Icon {...p} d={<><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>} />;
export const SparkIcon   = (p) => <Icon {...p} d={<path d="M9.94 14.34 8 22l-2-6-6-2 7.66-1.94a2 2 0 0 0 1.4-1.4L11 3l1.94 7.66a2 2 0 0 0 1.4 1.4L22 14l-7.66 1.94a2 2 0 0 0-1.4 1.4Z"/>} />;
export const CheckIcon   = (p) => <Icon {...p} d={<path d="M20 6 9 17l-5-5"/>} />;
export const UndoIcon    = (p) => <Icon {...p} d={<><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></>} />;
export const RedoIcon    = (p) => <Icon {...p} d={<><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></>} />;
export const FitIcon     = (p) => <Icon {...p} d={<><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></>} />;
export const SearchIcon  = (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
export const MicIcon     = (p) => <Icon {...p} d={<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></>} />;
export const PlayIcon    = (p) => <Icon {...p} d={<polygon points="6 3 20 12 6 21 6 3"/>} />;
export const GearIcon    = (p) => <Icon {...p} d={<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>} />;
export const DownloadIcon= (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>} />;
export const FoldIcon    = (p) => <Icon {...p} d={<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>} />;
export const UnfoldIcon  = (p) => <Icon {...p} d={<path d="m7 20 5-5 5 5M7 4l5 5 5-5"/>} />;
export const ZapIcon_    = (p) => <Icon {...p} d={<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>} />;
export const PinIcon     = (p) => <Icon {...p} d={<><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></>} />;
export const MsgIcon     = (p) => <Icon {...p} d={<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>} />;
export const ClockIcon   = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;
export const MagnetIcon  = (p) => <Icon {...p} d={<><path d="m6 15-3-3 6.7-6.7a6 6 0 0 1 8.5 0l4.2 4.2a6 6 0 0 1 0 8.5L15 21l-3-3"/><path d="m9 18 3 3"/><path d="m14 7 3 3"/></>} />;
export const ChevronDownIcon = (p) => <Icon {...p} d={<path d="m6 9 6 6 6-6"/>} />;

