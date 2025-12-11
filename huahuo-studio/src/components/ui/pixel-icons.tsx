import { type SVGProps } from 'react';
import { cn } from '@/lib/utils';

export interface PixelIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

function createPixelIcon(paths: React.ReactNode, displayName: string) {
  const Icon = ({ size = 24, className, ...props }: PixelIconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn('shrink-0', className)}
      {...props}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const IconHome = createPixelIcon(
  <><path d="M3 12L12 3L21 12" /><path d="M5 10V20H19V10" /><path d="M9 20V14H15V20" /></>,
  'IconHome'
);

export const IconScript = createPixelIcon(
  <><rect x="4" y="2" width="16" height="20" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" /></>,
  'IconScript'
);

export const IconCharacter = createPixelIcon(
  <><circle cx="12" cy="8" r="4" /><path d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20" /></>,
  'IconCharacter'
);

export const IconStoryboard = createPixelIcon(
  <><rect x="2" y="2" width="8" height="8" /><rect x="14" y="2" width="8" height="8" /><rect x="2" y="14" width="8" height="8" /><rect x="14" y="14" width="8" height="8" /></>,
  'IconStoryboard'
);

export const IconRender = createPixelIcon(
  <polygon points="5,3 19,12 5,21" />,
  'IconRender'
);

export const IconEditor = createPixelIcon(
  <><rect x="2" y="6" width="20" height="12" /><line x1="8" y1="6" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="18" /></>,
  'IconEditor'
);

export const IconSettings = createPixelIcon(
  <><circle cx="12" cy="12" r="3" /><path d="M12 2V6M12 18V22M2 12H6M18 12H22" /></>,
  'IconSettings'
);

export const IconMagic = createPixelIcon(
  <><path d="M15 4L20 9L9 20L4 15L15 4Z" /><path d="M12 2L14 4" /></>,
  'IconMagic'
);

export const IconPlus = createPixelIcon(
  <><line x1="12" y1="4" x2="12" y2="20" /><line x1="4" y1="12" x2="20" y2="12" /></>,
  'IconPlus'
);

export const IconClose = createPixelIcon(
  <><line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" /></>,
  'IconClose'
);

export const IconCheck = createPixelIcon(
  <polyline points="4,12 9,17 20,6" />,
  'IconCheck'
);

export const IconChevronLeft = createPixelIcon(
  <polyline points="15,4 7,12 15,20" />,
  'IconChevronLeft'
);

export const IconChevronRight = createPixelIcon(
  <polyline points="9,4 17,12 9,20" />,
  'IconChevronRight'
);

export const IconChevronDown = createPixelIcon(
  <polyline points="4,9 12,17 20,9" />,
  'IconChevronDown'
);

export const IconUpload = createPixelIcon(
  <><path d="M12 17V5" /><polyline points="6,9 12,3 18,9" /><line x1="4" y1="21" x2="20" y2="21" /></>,
  'IconUpload'
);

export const IconDownload = createPixelIcon(
  <><path d="M12 3V15" /><polyline points="6,11 12,17 18,11" /><line x1="4" y1="21" x2="20" y2="21" /></>,
  'IconDownload'
);

export const IconSave = createPixelIcon(
  <><path d="M5 3H19L21 5V21H3V5L5 3Z" /><rect x="7" y="3" width="10" height="6" /><rect x="7" y="13" width="10" height="8" /></>,
  'IconSave'
);

export const IconTrash = createPixelIcon(
  <><polyline points="3,6 21,6" /><path d="M8 6V4H16V6" /><path d="M5 6L6 20H18L19 6" /></>,
  'IconTrash'
);

export const IconEdit = createPixelIcon(
  <path d="M16 3L21 8L8 21H3V16L16 3Z" />,
  'IconEdit'
);

export const IconRefresh = createPixelIcon(
  <><path d="M20 12A8 8 0 1 1 12 4" /><polyline points="20,4 20,10 14,10" /></>,
  'IconRefresh'
);

export const IconPlay = createPixelIcon(
  <polygon points="6,4 20,12 6,20" />,
  'IconPlay'
);

export const IconPause = createPixelIcon(
  <><rect x="5" y="4" width="4" height="16" /><rect x="15" y="4" width="4" height="16" /></>,
  'IconPause'
);

export const IconImage = createPixelIcon(
  <><rect x="2" y="4" width="20" height="16" /><circle cx="8" cy="10" r="2" /><path d="M22 20L16 14L10 20" /></>,
  'IconImage'
);

export const IconVideo = createPixelIcon(
  <><rect x="2" y="4" width="14" height="16" /><path d="M16 8L22 4V20L16 16V8Z" /></>,
  'IconVideo'
);

export const IconFolder = createPixelIcon(
  <path d="M2 6H10L12 4H22V20H2V6Z" />,
  'IconFolder'
);

export const IconScene = createPixelIcon(
  <><rect x="2" y="4" width="20" height="16" /><path d="M2 16L8 10L12 14L16 8L22 14" /><circle cx="7" cy="8" r="2" /></>,
  'IconScene'
);

export const IconFile = createPixelIcon(
  <><path d="M4 2H14L20 8V22H4V2Z" /><path d="M14 2V8H20" /></>,
  'IconFile'
);

export const IconSearch = createPixelIcon(
  <><circle cx="10" cy="10" r="7" /><line x1="15" y1="15" x2="21" y2="21" /></>,
  'IconSearch'
);

export const IconMenu = createPixelIcon(
  <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>,
  'IconMenu'
);

export const IconAI = createPixelIcon(
  <><rect x="4" y="6" width="16" height="14" /><rect x="7" y="10" width="4" height="4" /><rect x="13" y="10" width="4" height="4" /></>,
  'IconAI'
);

export const IconBolt = createPixelIcon(
  <polygon points="13,2 4,14 11,14 9,22 20,10 13,10" />,
  'IconBolt'
);

export const IconWarning = createPixelIcon(
  <><path d="M12 2L22 20H2L12 2Z" /><line x1="12" y1="8" x2="12" y2="14" /></>,
  'IconWarning'
);

export const IconInfo = createPixelIcon(
  <><circle cx="12" cy="12" r="10" /><line x1="12" y1="10" x2="12" y2="16" /></>,
  'IconInfo'
);

export const IconDatabase = createPixelIcon(
  <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 5v6c0 1.7-4 3-9 3s-9-1.3-9-3V5" /><path d="M21 11v6c0 1.7-4 3-9 3s-9-1.3-9-3v-6" /></>,
  'IconDatabase'
);

export const Icons = {
  Home: IconHome, Script: IconScript, Character: IconCharacter, Storyboard: IconStoryboard,
  Render: IconRender, Editor: IconEditor, Settings: IconSettings, Magic: IconMagic,
  Plus: IconPlus, Close: IconClose, Check: IconCheck, ChevronLeft: IconChevronLeft,
  ChevronRight: IconChevronRight, ChevronDown: IconChevronDown, Upload: IconUpload,
  Download: IconDownload, Save: IconSave, Trash: IconTrash, Edit: IconEdit,
  Refresh: IconRefresh, Play: IconPlay, Pause: IconPause, Image: IconImage,
  Video: IconVideo, Folder: IconFolder, File: IconFile, Search: IconSearch,
  Menu: IconMenu, AI: IconAI, Bolt: IconBolt, Warning: IconWarning, Info: IconInfo,
  Database: IconDatabase,
};

export default Icons;
