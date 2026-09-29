import { useState } from 'react';

/**
 * Simple tab switcher. `tabs` is [{ id, label, content? }]; content can
 * also be rendered by the parent via a render function child.
 */
export default function Tabs({ tabs, initial, children }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  return (
    <div className="tabs">
      <div className="tab-list" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`tab ${active === t.id ? 'active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel">
        {children ? children(tabs.find((t) => t.id === active)) : tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
