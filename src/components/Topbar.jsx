import { useLocation } from 'react-router-dom';
import Icon from './icons.jsx';
import { routeTitles } from '../data/navigation.js';
import { useTheme } from '../context/ThemeContext.jsx';

const DEMO_DATE = new Date(2026, 8, 20);

export default function Topbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  const current =
    routeTitles.find((r) => r.to === pathname) ??
    routeTitles.find((r) => pathname.startsWith(`${r.to}/`)) ??
    routeTitles[0];

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(DEMO_DATE);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{current.label}</h1>
        <p className="topbar-crumb">
          Clinical Mode <span className="crumb-sep">/</span> {current.label}
        </p>
      </div>

      <div className="topbar-actions">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Search biomarkers, modules…"
            aria-label="Search"
          />
        </div>
        <span className="topbar-date">{today}</span>
        <button
          type="button"
          className="icon-button"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          onClick={toggleTheme}
        >
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
        </button>
        <button type="button" className="icon-button" aria-label="Notifications">
          <Icon name="bell" size={18} />
        </button>
        <span className="topbar-avatar" title="Researcher (demo)">
          RS
        </span>
      </div>
    </header>
  );
}
