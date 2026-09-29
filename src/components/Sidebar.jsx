import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './icons.jsx';
import { navSections } from '../data/navigation.js';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* زرار الفتح / القفل */}
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Click-outside backdrop (mobile drawer only) */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="sidebar-close"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>

        <nav className="sidebar-nav" aria-label="Main">
          {navSections.map((group) => (
            <div className="nav-group" key={group.section}>
              <p className="nav-section-label">{group.section}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)} // بتقفل القائمة لما تضغط على لينك
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="proto-chip">Prototype</span>
          <p className="sidebar-footer-note">
            Research build — research observation only. Requires professional
            interpretation. Not a medical device and not a diagnosis.
          </p>
        </div>
      </aside>
    </>
  );
}