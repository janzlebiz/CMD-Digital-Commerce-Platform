/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ConsultationService,
  PractitionerProfile,
  ConsultationSlot,
  ConsultationAppointment,
  ClinicalIntakeData,
  InformedConsentRecord,
} from '../types';
import {
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  FileText,
  Lock,
  Heart,
  Video,
  MapPin,
  RefreshCw,
  XCircle,
  Activity,
  Sparkles,
} from 'lucide-react';

const STATUTORY_CONSENT_TEXT = `I understand that this consultation is a holistic wellness and nutritional education session provided by a wellness practitioner. It does not replace medical consultation, diagnosis, or treatment with a licensed physician under Republic Act No. 2382. I will not discontinue any prescribed medical treatment without consulting my doctor. Pursuant to Section 13(a) of the Data Privacy Act of 2012 (RA 10173), I hereby give my explicit informed consent for the secure processing and hardware-backed encryption of my health intake records strictly for nutritional consultation purposes.`;

export const ConsultationsView: React.FC = () => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'book' | 'my-appointments' | 'practitioner'>('book');

  // Booking Flow State
  const [services, setServices] = useState<ConsultationService[]>([]);
  const [practitioners, setPractitioners] = useState<PractitionerProfile[]>([]);
  const [selectedService, setSelectedService] = useState<ConsultationService | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<PractitionerProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<ConsultationSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ConsultationSlot | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'in_person' | 'virtual'>('virtual');
  const [selectedBranch, setSelectedBranch] = useState<string>('daet');

  // Customer Contact State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Consent & Intake State
  const [consentAcknowledged, setConsentAcknowledged] = useState<boolean>(false);
  const [intakeData, setIntakeData] = useState<ClinicalIntakeData>({
    dietaryHabits: '',
    waterConsumption: '',
    lifestyleStress: '',
    energyLevels: '',
    declaredConditions: '',
    hydrationGoals: '',
  });

  // UI status
  const [loading, setLoading] = useState<boolean>(false);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<ConsultationAppointment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Appointments State
  const [myAppointments, setMyAppointments] = useState<ConsultationAppointment[]>([]);
  const [practitionerAppointments, setPractitionerAppointments] = useState<ConsultationAppointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState<boolean>(false);

  // Practitioner Decryption Workspace State
  const [selectedIntakeRecord, setSelectedIntakeRecord] = useState<any | null>(null);
  const [decryptingIntakeId, setDecryptingIntakeId] = useState<string | null>(null);

  const isPractitionerOrAdmin = profile?.role === 'practitioner' || profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) {
      setCustomerName(`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email);
    }
  }, [profile]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [srvRes, pracRes] = await Promise.all([
          fetch('/api/consultations/services'),
          fetch('/api/consultations/practitioners'),
        ]);

        if (srvRes.ok) {
          const srvData = await srvRes.json();
          setServices(srvData.services || []);
          if (srvData.services?.length > 0) {
            setSelectedService(srvData.services[0]);
          }
        }

        if (pracRes.ok) {
          const pracData = await pracRes.json();
          setPractitioners(pracData.practitioners || []);
          if (pracData.practitioners?.length > 0) {
            setSelectedPractitioner(pracData.practitioners[0]);
          }
        }
      } catch (err: any) {
        console.error('Failed to load consultation catalog:', err);
      }
    };
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!selectedPractitioner || !selectedDate) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await fetch(`/api/consultations/slots?practitionerId=${selectedPractitioner.id}&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.slots || []);
          setSelectedSlot(null);
        }
      } catch (err: any) {
        console.error('Failed to load slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedPractitioner, selectedDate]);

  const fetchMyAppointments = async () => {
    if (!user) return;
    setLoadingAppts(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/consultations/my-appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyAppointments(data.appointments || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch user appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const fetchPractitionerAppointments = async () => {
    if (!user || !isPractitionerOrAdmin) return;
    setLoadingAppts(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/consultations/practitioner-appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPractitionerAppointments(data.appointments || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch practitioner appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-appointments' && user) {
      fetchMyAppointments();
    } else if (activeTab === 'practitioner' && user && isPractitionerOrAdmin) {
      fetchPractitionerAppointments();
    }
  }, [activeTab, user, isPractitionerOrAdmin]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Please sign in to book a wellness consultation.');
      return;
    }
    if (!selectedService || !selectedPractitioner || !selectedSlot) {
      setErrorMessage('Please select a service, practitioner, and an available time slot.');
      return;
    }
    if (!consentAcknowledged) {
      setErrorMessage('You must acknowledge the statutory informed consent to proceed.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const token = await user.getIdToken();

      const consentRecord: InformedConsentRecord = {
        purpose: 'Naturopathic Wellness & Hydration Education',
        version: 'v1.0',
        timestamp: new Date().toISOString(),
        legalBasis: 'RA_10173_SECTION_13_A_EXPLICIT_CONSENT',
        acknowledgedText: STATUTORY_CONSENT_TEXT,
        withdrawalState: { isWithdrawn: false },
      };

      const bookingPayload = {
        serviceCode: selectedService.code,
        practitionerId: selectedPractitioner.id,
        scheduledDate: selectedDate,
        scheduledTime: selectedSlot.startTime,
        deliveryMode,
        branchId: selectedBranch,
        customerName,
        customerPhone,
        consentRecord,
      };

      const bookRes = await fetch('/api/consultations/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!bookRes.ok) {
        const errData = await bookRes.json();
        throw new Error(errData.error || 'Failed to book consultation.');
      }

      const bookingResult = await bookRes.json();
      const bookedAppt = bookingResult.appointment;

      if (
        intakeData.dietaryHabits.trim() ||
        intakeData.waterConsumption.trim() ||
        intakeData.declaredConditions.trim()
      ) {
        try {
          await fetch('/api/clinical/intake/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              patientUid: user.uid,
              scheduledAt: `${selectedDate}T${selectedSlot.startTime}:00Z`,
              deliveryMode,
              clinicalIntake: {
                dietaryHabits: intakeData.dietaryHabits,
                waterConsumption: intakeData.waterConsumption,
                declaredConditions: intakeData.declaredConditions,
              },
              consentRecord,
            }),
          });
        } catch (intakeErr) {
          console.warn('Intake saved with booking notice:', intakeErr);
        }
      }

      setBookingSuccess(bookedAppt);
      setSelectedSlot(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to cancel this scheduled consultation?')) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/consultations/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId, reason: 'Client requested cancellation' }),
      });

      if (res.ok) {
        fetchMyAppointments();
        if (isPractitionerOrAdmin) fetchPractitionerAppointments();
      }
    } catch (err: any) {
      console.error('Cancellation error:', err);
    }
  };

  const handleFetchDecryptedIntake = async (intakeId: string) => {
    if (!user) return;
    setDecryptingIntakeId(intakeId);
    setSelectedIntakeRecord(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/clinical/intake/${intakeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to decrypt clinical intake.');
      }

      const data = await res.json();
      setSelectedIntakeRecord(data);
    } catch (err: any) {
      alert(`Decryption Error: ${err.message}`);
    } finally {
      setDecryptingIntakeId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner matching White & Blue Branding */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-sky-400/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-xs font-extrabold tracking-wide">
              <Activity className="w-4 h-4 text-cyan-300" />
              <span>Naturopathic Wellness & Mineral Hydration Education</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Holistic Wellness Consultations
            </h1>
            <p className="text-sky-100 text-xs sm:text-base max-w-3xl leading-relaxed">
              Connect with certified wellness practitioners across Camarines Norte for personalized cellular mineral dilution protocols, dietary guidance, and vitality coaching.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-slate-700 rounded-2xl p-1.5 self-stretch sm:self-auto shrink-0 shadow-sm">
            <button
              onClick={() => setActiveTab('book')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'book'
                  ? 'bg-white text-sky-900 shadow-md'
                  : 'text-sky-100 hover:text-white'
              }`}
            >
              Book Session
            </button>
            <button
              onClick={() => setActiveTab('my-appointments')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'my-appointments'
                  ? 'bg-white text-sky-900 shadow-md'
                  : 'text-sky-100 hover:text-white'
              }`}
            >
              My Appointments
            </button>
            {isPractitionerOrAdmin && (
              <button
                onClick={() => setActiveTab('practitioner')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeTab === 'practitioner'
                    ? 'bg-white text-sky-900 shadow-md'
                    : 'text-sky-100 hover:text-white'
                }`}
              >
                Practitioner
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-sky-500/40 flex items-start gap-3 text-xs text-sky-100 leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">MAHALAGANG PAALALA: </span>
            Ang mga wellness consultation ay para sa holistic nutritional education at lifestyle vitality coaching. Ito ay{' '}
            <span className="font-bold underline">HINDI paggagamot, medikal na diyagnosis, o reseta</span> sa ilalim ng Republic Act No. 2382. Protektado ang inyong health intake sa ilalim ng RA 10173 Section 13(a) gamit ang Google Cloud KMS envelope encryption.
          </div>
        </div>
      </div>

      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {bookingSuccess ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-sky-300 dark:border-slate-800 shadow-md text-center space-y-4">
                <div className="w-16 h-16 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Consultation Scheduled Successfully!</h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
                  Your session has been confirmed. A practitioner has been assigned, and your health data is securely encrypted in our private clinical store.
                </p>

                <div className="bg-sky-50 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-2xl p-5 text-left text-xs sm:text-sm space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Appointment ID:</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">{bookingSuccess.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{bookingSuccess.serviceTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Practitioner:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{bookingSuccess.practitionerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="font-bold text-sky-700 dark:text-sky-400">
                      {bookingSuccess.scheduledDate} at {bookingSuccess.scheduledTime}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setBookingSuccess(null);
                      setActiveTab('my-appointments');
                    }}
                    className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    View in My Appointments
                  </button>
                  <button
                    onClick={() => setBookingSuccess(null)}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Book Another Session
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 flex items-start gap-3 text-red-700 dark:text-red-300 text-xs">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Step 1: Select Service */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-extrabold">1</span>
                    Select Consultation Service
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {services.map((srv) => (
                      <div
                        key={srv.code}
                        onClick={() => {
                          setSelectedService(srv);
                          setDeliveryMode(srv.deliveryMode === 'in_person' ? 'in_person' : 'virtual');
                        }}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                          selectedService?.code === srv.code
                            ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 shadow-sm ring-1 ring-sky-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold font-mono text-sky-700 dark:text-sky-400">{srv.code}</span>
                          <span className="text-xs font-medium text-slate-500">{srv.durationMinutes} mins</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{srv.title}</h4>
                        <div className="mt-2 text-[10px] text-sky-800 dark:text-sky-300 font-semibold bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800 inline-block">
                          {srv.feeDisplay}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 2: Select Practitioner */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-extrabold">2</span>
                    Select Wellness Practitioner
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {practitioners.map((prac) => (
                      <div
                        key={prac.id}
                        onClick={() => setSelectedPractitioner(prac)}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                          selectedPractitioner?.id === prac.id
                            ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 shadow-sm ring-1 ring-sky-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-sm shrink-0">
                            {prac.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{prac.name}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{prac.title}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                {prac.languages.join(', ')}
                              </span>
                              <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded">
                                Certified Practitioner
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 3: Date, Mode, & Slots */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-extrabold">3</span>
                    Choose Date & Available Time Slot
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Consultation Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-sky-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Delivery Mode</label>
                      <select
                        value={deliveryMode}
                        onChange={(e) => setDeliveryMode(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-sky-500"
                      >
                        <option value="virtual">Virtual Video Call (Bicol / Remote)</option>
                        <option value="in_person">In-Branch Physical (Camarines Norte)</option>
                      </select>
                    </div>

                    {deliveryMode === 'in_person' && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Branch Location</label>
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-sky-500"
                        >
                          <option value="daet">Daet Central Hub</option>
                          <option value="labo">Labo Branch</option>
                          <option value="capalonga">Capalonga Branch</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Available Slots for {selectedDate}:
                    </span>
                    {slotsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading real-time availability...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-xs text-slate-500 py-2">No available slots for this date. Please select another day.</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            type="button"
                            key={slot.slotId}
                            disabled={slot.isBooked}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                              slot.isBooked
                                ? 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed line-through'
                                : selectedSlot?.slotId === slot.slotId
                                ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                            {slot.startTime} – {slot.endTime}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Encrypted Clinical Intake Questions */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-extrabold">4</span>
                      Pre-Session Health Intake Questionnaire (Encrypted via Google Cloud KMS)
                    </label>
                    <span className="text-xs text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 flex items-center gap-1 font-semibold">
                      <Lock className="w-3 h-3" />
                      AES-256-GCM
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    To help your practitioner prepare tailored mineral hydration protocols, please answer the optional questions below. Your answers are protected by hardware-backed Cloud KMS encryption and cannot be viewed by retail staff.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Daily Dietary Habits & Typical Meals</label>
                      <textarea
                        value={intakeData.dietaryHabits}
                        onChange={(e) => setIntakeData({ ...intakeData, dietaryHabits: e.target.value })}
                        placeholder="e.g. Regular rice and fish, high sodium intake, occasional coffee..."
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Daily Water & Liquid Consumption</label>
                      <textarea
                        value={intakeData.waterConsumption}
                        onChange={(e) => setIntakeData({ ...intakeData, waterConsumption: e.target.value })}
                        placeholder="e.g. 1.5 liters filtered tap water, 2 cups sweetened tea..."
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Declared Health Goals or Stress Factors</label>
                      <textarea
                        value={intakeData.declaredConditions}
                        onChange={(e) => setIntakeData({ ...intakeData, declaredConditions: e.target.value })}
                        placeholder="e.g. Chronic afternoon fatigue, muscle cramps during farm work, wellness hydration goal..."
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 5: Standalone RA 10173 Section 13(a) Informed Consent */}
                <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-slate-950 border border-sky-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-300">
                    <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Statutory Informed Consent (Data Privacy Act of 2012 — RA 10173 Section 13(a))
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-sky-100 dark:border-slate-800">
                    {STATUTORY_CONSENT_TEXT}
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={consentAcknowledged}
                      onChange={(e) => setConsentAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500"
                      required
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      I have read, understood, and explicitly agree to the statutory wellness terms and data processing consent above.
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedSlot ? `Selected: ${selectedDate} at ${selectedSlot.startTime}` : 'No slot selected'}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !selectedSlot || !consentAcknowledged}
                    className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Encrypting & Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm & Schedule Consultation
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Selected Service Overview
              </h3>

              {selectedService ? (
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-3 bg-sky-50 dark:bg-slate-950 rounded-2xl border border-sky-100 dark:border-slate-800">
                    <div className="font-bold text-sky-800 dark:text-sky-400 text-sm">{selectedService.title}</div>
                    <div className="mt-1 text-slate-600 dark:text-slate-400">{selectedService.description}</div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedService.durationMinutes} Minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Standard Delivery:</span>
                      <span className="font-semibold capitalize text-slate-900 dark:text-white">{selectedService.deliveryMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service Status:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Available across Camarines Norte</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Select a service to view details.</p>
              )}
            </div>

            <div className="bg-sky-50 dark:bg-slate-950 rounded-3xl p-6 border border-sky-100 dark:border-slate-800 shadow-sm space-y-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                Security & Privacy Firewall
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Sensitive Personal Information Protection</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Health intake questionnaires and wellness notes are protected with hardware-backed Google Cloud KMS envelope encryption. Decryption keys are NEVER stored in the database.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div>• Zero visibility by retail clerks & dispatch staff</div>
                <div>• RA 10173 Section 13(a) Explicit Consent Ledger</div>
                <div>• Real-time immutable audit trail for all accesses</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'my-appointments' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Scheduled Wellness Consultations</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Review your upcoming appointments, session details, and health intake statuses.
              </p>
            </div>
            <button
              onClick={fetchMyAppointments}
              disabled={loadingAppts}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAppts ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {!user ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs sm:text-sm">
              Please sign in with your account to view your scheduled consultations.
            </div>
          ) : loadingAppts ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading your consultations...</div>
          ) : myAppointments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <p>You have no scheduled consultations at this time.</p>
              <button
                onClick={() => setActiveTab('book')}
                className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Schedule Your First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 space-y-3 hover:border-sky-400 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                        {appt.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{appt.serviceTitle}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">With {appt.practitionerName}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                        appt.status === 'scheduled'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                          : appt.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{appt.scheduledDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{appt.scheduledTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {appt.deliveryMode === 'in_person' ? (
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Video className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="capitalize">{appt.deliveryMode}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>KMS Encrypted</span>
                    </div>
                  </div>

                  {appt.status === 'scheduled' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-semibold transition"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'practitioner' && isPractitionerOrAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 text-xs font-bold mb-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Secure Clinical Review Workspace</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assigned Patient Consultations</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accessible exclusively to assigned practitioners. Protected by Cloud KMS envelope decryption.
              </p>
            </div>
            <button
              onClick={fetchPractitionerAppointments}
              disabled={loadingAppts}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAppts ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {practitionerAppointments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No patient appointments assigned to your practitioner workspace yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Appointment ID</th>
                      <th className="p-3">Patient Name</th>
                      <th className="p-3">Service</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Delivery Mode</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Clinical Intake</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {practitionerAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-sky-50/50 dark:hover:bg-slate-950/50">
                        <td className="p-3 font-mono font-bold text-sky-700 dark:text-sky-400">{appt.id}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{appt.customerName}</td>
                        <td className="p-3">{appt.serviceTitle}</td>
                        <td className="p-3 font-medium">
                          {appt.scheduledDate} @ {appt.scheduledTime}
                        </td>
                        <td className="p-3 capitalize">{appt.deliveryMode}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            {appt.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleFetchDecryptedIntake(appt.id)}
                            disabled={decryptingIntakeId === appt.id}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold text-[11px] rounded-lg border border-sky-200 dark:border-sky-800 flex items-center gap-1 transition"
                          >
                            <Lock className="w-3 h-3" />
                            {decryptingIntakeId === appt.id ? 'Decrypting...' : 'View Intake'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedIntakeRecord && (
                <div className="mt-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-sm">
                      <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      Decrypted Clinical Intake Summary
                    </div>
                    <button
                      onClick={() => setSelectedIntakeRecord(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">Dietary & Meal Habits:</span>
                      <p className="text-slate-600 dark:text-slate-400">{selectedIntakeRecord.decryptedClinicalIntake?.dietaryHabits || 'None declared.'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">Daily Water & Liquid Intake:</span>
                      <p className="text-slate-600 dark:text-slate-400">{selectedIntakeRecord.decryptedClinicalIntake?.waterConsumption || 'None declared.'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2">
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">Declared Health Conditions / Goals:</span>
                      <p className="text-slate-600 dark:text-slate-400">{selectedIntakeRecord.decryptedClinicalIntake?.declaredConditions || 'None declared.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
