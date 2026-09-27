/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';

export const ReturnsView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-slate-300 text-xs leading-relaxed">
      <h1 className="text-2xl font-bold text-white">Returns & Refund Policy (Consumer Act — RA 7394)</h1>
      <p>Last updated: September 27, 2026</p>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">1. Damaged or Broken Tamper Seals</h2>
        <p>
          If you receive an HCI CMD bottle with a broken or tampered holographic seal upon delivery or branch pickup, you are entitled to an immediate free replacement or full refund within 7 calendar days of receipt.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">2. Return Procedure at Branches</h2>
        <p>
          Present your order receipt and the unopened/damaged bottle at any of our 6 Camarines Norte branch hubs (Daet, Labo, Capalonga, Paracale, Jose Panganiban, Santa Elena) for instant resolution.
        </p>
      </section>
    </div>
  );
};
