/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface RegulatoryNoticeProps {
  level?: 'warning' | 'info' | 'statutory';
  title?: string;
  children: React.ReactNode;
  citation?: string;
  className?: string;
}

export const RegulatoryNotice: React.FC<RegulatoryNoticeProps> = ({
  level = 'info',
  title,
  children,
  citation,
  className = '',
}) => {
  const getStyles = () => {
    switch (level) {
      case 'warning':
        return {
          container: 'bg-rose-950/20 border-rose-800/40 text-rose-200',
          title: 'text-rose-300 font-semibold',
          citation: 'text-rose-400/80',
        };
      case 'statutory':
        return {
          container: 'bg-amber-950/30 border-amber-800/50 text-amber-100',
          title: 'text-amber-300 font-semibold',
          citation: 'text-amber-400/80',
        };
      case 'info':
      default:
        return {
          container: 'bg-slate-900/60 border-slate-700/60 text-slate-300',
          title: 'text-slate-100 font-semibold',
          citation: 'text-slate-400',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      role="region"
      aria-label={title || 'Regulatory notice'}
      className={`border rounded-md p-4 text-xs sm:text-sm leading-relaxed ${styles.container} ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`uppercase tracking-wider text-xs ${styles.title}`}>
            {title}
          </span>
          {citation && (
            <>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className={`text-[11px] font-mono ${styles.citation}`}>
                {citation}
              </span>
            </>
          )}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
