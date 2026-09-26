/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES } from '../data/compliance';
import { BRANCHES_DATA } from '../data/branches';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface ContactViewProps {
  onNavigate: (view: PageView) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    branchOrTopic: 'daet',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.fullName.trim()) errors.fullName = 'Please provide your full name.';
    if (!formData.email.trim() || !formData.email.includes('@'))
      errors.email = 'Please provide a valid email address.';
    if (!formData.message.trim()) errors.message = 'Please enter your message.';
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Communication & Inquiries</span>
          <span aria-hidden="true">·</span>
          <span>Province of Camarines Norte</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Contact & Inquiries
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          Reach our regional distribution administration, submit branch-specific questions, or consult with our regulatory team.
        </p>
      </div>

      {/* Mandatory Statutory Notice */}
      <RegulatoryNotice level="statutory" title="Mandatory Food Supplement Disclaimer" citation="FDA Circular No. 2015-003">
        <p className="font-semibold text-amber-200">
          {STATUTORY_NOTICES.FILIPINO_WARNING}
        </p>
        <p className="text-xs text-amber-300/80 mt-1 uppercase tracking-wider font-bold">
          {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
        </p>
      </RegulatoryNotice>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Contact Information & Regional Logistics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-serif font-bold text-white text-lg">
              Regional Administration Hub
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Administrative headquarters and central logistics replenishment depot located in Daet, serving satellite branches in Labo, Paracale, Jose Panganiban, Capalonga, and Sta. Elena.
            </p>

            <div className="space-y-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block font-medium">Regional Hub Location:</span>
                <span className="text-slate-200">Daet Town Proper, Camarines Norte</span>
                <span className="block text-[11px] text-amber-400/80 italic">
                  Exact building & street address pending business confirmation.
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Telecom Lines:</span>
                <span className="text-slate-200">Official Branch Lines Pending Telecom Activation</span>
                <span className="block text-[11px] text-slate-400 italic">
                  Direct mobile and landline hotlines will publish upon Phase 2 rollout.
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Operating Hours:</span>
                <span className="text-slate-200 font-mono">Mon – Sat: 8:30 AM – 5:30 PM</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-3">
            <h3 className="font-serif font-bold text-white text-base">
              Compliance & Safety Inquiries
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              For regulatory verifications, FDA registration documentation inquiries, or compliance questions regarding our 5-tier claims policy, select &quot;Regulatory Compliance & Data Privacy&quot; in the form.
            </p>
          </div>
        </div>

        {/* Right: Interactive Contact & Inquiry Form */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            {submitted ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <h3 className="font-serif font-bold text-white text-xl">
                  Inquiry Received
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  Thank you, <strong>{formData.fullName}</strong>. Your message regarding{' '}
                  <span className="text-amber-300 font-medium">
                    {formData.branchOrTopic === 'compliance'
                      ? 'Regulatory Compliance'
                      : formData.branchOrTopic === 'general'
                      ? 'General Inquiry'
                      : `${formData.branchOrTopic.toUpperCase()} Branch`}
                  </span>{' '}
                  has been recorded in our Phase 1 regional inquiry log. Our operations team will respond to {formData.email} within 1 to 2 business days.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        fullName: '',
                        email: '',
                        phone: '',
                        branchOrTopic: 'daet',
                        subject: '',
                        message: '',
                      });
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <h3 className="font-serif font-bold text-white text-lg">
                    Send an Inquiry
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Fill in your details below and our team will get in touch with you.
                  </p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="fullName" className="block text-xs font-medium text-slate-300">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Juan Dela Cruz"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-invalid={!!formErrors.fullName}
                  />
                  {formErrors.fullName && (
                    <p className="text-[11px] text-rose-400">{formErrors.fullName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="juan@example.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      aria-invalid={!!formErrors.email}
                    />
                    {formErrors.email && (
                      <p className="text-[11px] text-rose-400">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="phone" className="block text-xs font-medium text-slate-300">
                      Mobile Number (Optional)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0917-000-0000"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="branchOrTopic" className="block text-xs font-medium text-slate-300">
                      Inquiry Routing
                    </label>
                    <select
                      id="branchOrTopic"
                      value={formData.branchOrTopic}
                      onChange={(e) => setFormData({ ...formData, branchOrTopic: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <option value="general">General Platform Inquiry</option>
                      <option value="compliance">Regulatory Compliance & Data Privacy</option>
                      <optgroup label="Camarines Norte Branches">
                        {BRANCHES_DATA.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.municipality})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="subject" className="block text-xs font-medium text-slate-300">
                      Subject
                    </label>
                    <input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Product availability, dilution, etc."
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="message" className="block text-xs font-medium text-slate-300">
                    Message <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write your questions or notes here..."
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-invalid={!!formErrors.message}
                  />
                  {formErrors.message && (
                    <p className="text-[11px] text-rose-400">{formErrors.message}</p>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  By submitting this form, you consent to the processing of your contact details solely for answering your inquiry pursuant to Republic Act No. 10173 (Data Privacy Act of 2012).
                </p>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  Send Inquiry Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
