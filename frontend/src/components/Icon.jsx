import './Icon.css';

const ICONS = {
  Add: {
    paths: [
      <path key="add-horizontal" d="M5 12h14" />,
      <path key="add-vertical" d="M12 5v14" />,
    ],
  },
  ArrowRight: {
    paths: [
      <path key="arrow-line" d="M5 12h14" />,
      <path key="arrow-head" d="m13 5 7 7-7 7" />,
    ],
  },
  ArrowLeft: {
    paths: [
      <path key="arrow-line" d="M19 12H5" />,
      <path key="arrow-head" d="m11 5-7 7 7 7" />,
    ],
  },
  ArrowUp: {
    paths: [
      <path key="arrow-line" d="M12 19V5" />,
      <path key="arrow-head" d="m5 11 7-7 7 7" />,
    ],
  },
  Bell: {
    paths: [
      <path key="bell-body" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />,
      <path key="bell-clapper" d="M10 21h4" />,
    ],
  },
  Chat: {
    paths: [
      <path key="chat" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
    ],
  },
  Check: {
    paths: [<path key="check" d="m5 12 4 4 10-10" />],
  },
  CheckCircle: {
    paths: [
      <circle key="check-circle" cx="12" cy="12" r="9" />,
      <path key="check-path" d="m8 12 3 3 5-6" />,
    ],
  },
  ChevronDown: {
    paths: [<path key="chevron" d="m6 9 6 6 6-6" />],
  },
  ChevronLeft: {
    paths: [<path key="chevron-left" d="m15 18-6-6 6-6" />],
  },
  ChevronRight: {
    paths: [<path key="chevron-right" d="m9 18 6-6-6-6" />],
  },
  Close: {
    paths: [
      <path key="close-1" d="M18 6 6 18" />,
      <path key="close-2" d="m6 6 12 12" />,
    ],
  },
  DarkMode: {
    paths: [<path key="moon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />],
  },
  Dashboard: {
    paths: [
      <rect key="tile-1" x="3" y="3" width="7" height="7" rx="1.5" />,
      <rect key="tile-2" x="14" y="3" width="7" height="7" rx="1.5" />,
      <rect key="tile-3" x="3" y="14" width="7" height="7" rx="1.5" />,
      <rect key="tile-4" x="14" y="14" width="7" height="7" rx="1.5" />,
    ],
  },
  Delete: {
    paths: [
      <path key="delete-top" d="M3 6h18" />,
      <path key="delete-handle" d="M8 6V4h8v2" />,
      <path key="delete-box" d="M6 6l1 15h10l1-15" />,
      <path key="delete-line-1" d="M10 11v6" />,
      <path key="delete-line-2" d="M14 11v6" />,
    ],
  },
  Edit: {
    paths: [
      <path key="edit-box" d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z" />,
      <path key="edit-line" d="m13 7 4 4" />,
    ],
  },
  Explore: {
    paths: [
      <circle key="explore-circle" cx="12" cy="12" r="9" />,
      <path key="explore-needle" d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9z" />,
    ],
  },
  Folder: {
    paths: [
      <path key="folder" d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    ],
  },
  History: {
    paths: [
      <path key="history-arrow" d="M3 12a9 9 0 1 0 3-6.71" />,
      <path key="history-turn" d="M3 4v5h5" />,
      <path key="history-hand" d="M12 7v5l3 2" />,
    ],
  },
  Info: {
    paths: [
      <circle key="info-circle" cx="12" cy="12" r="9" />,
      <path key="info-line" d="M12 10v6" />,
      <path key="info-dot" d="M12 7h.01" />,
    ],
  },
  LightMode: {
    paths: [
      <circle key="sun-core" cx="12" cy="12" r="4" />,
      <path key="sun-rays" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />,
    ],
  },
  Logout: {
    paths: [
      <path key="logout-door" d="M10 17 15 12 10 7" />,
      <path key="logout-line" d="M15 12H3" />,
      <path key="logout-box" d="M21 19V5a2 2 0 0 0-2-2h-6" />,
    ],
  },
  Notifications: {
    alias: 'Bell',
  },
  ReceiptLong: {
    paths: [
      <path key="receipt-page" d="M6 3h12v18l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" />,
      <path key="receipt-line-1" d="M9 8h6" />,
      <path key="receipt-line-2" d="M9 12h6" />,
      <path key="receipt-line-3" d="M9 16h4" />,
    ],
  },
  Search: {
    paths: [
      <circle key="search-circle" cx="11" cy="11" r="7" />,
      <path key="search-line" d="m16 16 4 4" />,
    ],
  },
  Visibility: {
    paths: [
      <path key="eye" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />,
      <circle key="eye-dot" cx="12" cy="12" r="3" />,
    ],
  },
  VisibilityOff: {
    paths: [
      <path key="eye-off-1" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />,
      <path key="eye-off-2" d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />,
      <line key="eye-off-3" x1="1" y1="1" x2="23" y2="23" />,
    ],
  },
  Workspaces: {
    paths: [
      <rect key="workspace-main" x="4" y="4" width="16" height="12" rx="2" />,
      <path key="workspace-stand" d="M9 20h6" />,
      <path key="workspace-leg" d="M12 16v4" />,
    ],
  },
};

const NAME_ALIASES = {
  add: 'Add',
  plus: 'Add',
  arrowRight: 'ArrowRight',
  arrowLeft: 'ArrowLeft',
  arrowUp: 'ArrowUp',
  bell: 'Bell',
  chat: 'Chat',
  check: 'Check',
  checkCircle: 'CheckCircle',
  chevron: 'ChevronDown',
  chevronDown: 'ChevronDown',
  chevronLeft: 'ChevronLeft',
  chevronRight: 'ChevronRight',
  ChevronDownRounded: 'ChevronDown',
  close: 'Close',
  dashboard: 'Dashboard',
  darkMode: 'DarkMode',
  delete: 'Delete',
  edit: 'Edit',
  explore: 'Explore',
  folder: 'Folder',
  history: 'History',
  info: 'Info',
  lightMode: 'LightMode',
  logout: 'Logout',
  notifications: 'Notifications',
  receiptLong: 'ReceiptLong',
  search: 'Search',
  visibility: 'Visibility',
  visibilityOff: 'VisibilityOff',
  workspaces: 'Workspaces',
};

function resolveIcon(name) {
  const iconName = NAME_ALIASES[name] || name;
  const icon = ICONS[iconName];

  if (icon?.alias) {
    return ICONS[icon.alias];
  }

  return icon || ICONS.Search;
}

export default function Icon({
  name,
  size = 'md',
  className = '',
  title,
  strokeWidth = 2,
  ...props
}) {
  const icon = resolveIcon(name);
  const labelledProps = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  return (
    <svg
      viewBox="0 0 24 24"
      className={['icon', `icon--${size}`, className].filter(Boolean).join(' ')}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      {...labelledProps}
      {...props}
    >
      {title && <title>{title}</title>}
      {icon.paths}
    </svg>
  );
}
