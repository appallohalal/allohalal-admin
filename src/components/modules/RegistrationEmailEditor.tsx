'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  X,
  Sparkles,
  ShieldCheck,
  Send,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Smartphone,
  Monitor,
  Copy,
  Info,
} from 'lucide-react';
import { AuthSettings } from '@/lib/types';
import { DEFAULT_EMAIL_TEMPLATES } from '@/lib/storage';
import { replaceEmailPlaceholders } from '@/lib/email-templates';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';

interface RegistrationEmailEditorProps {
  isOpen: boolean;
  onClose: () => void;
  authSettings: AuthSettings;
  onSaveAuthSettings?: (settings: AuthSettings) => Promise<void>;
  currentAdminEmail?: string;
}

type EmailTab = 'welcome' | 'confirmation';

export const RegistrationEmailEditor: React.FC<RegistrationEmailEditorProps> = ({
  isOpen,
  onClose,
  authSettings,
  onSaveAuthSettings,
  currentAdminEmail = '',
}) => {
  const [activeTab, setActiveTab] = useState<EmailTab>('welcome');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(
    currentAdminEmail || authSettings.smtpUser || ''
  );

  // Form state
  const [welcomeSubject, setWelcomeSubject] = useState(
    authSettings.welcomeEmailSubject || DEFAULT_EMAIL_TEMPLATES.welcomeSubject
  );
  const [welcomeTitle, setWelcomeTitle] = useState(
    authSettings.welcomeEmailTitle || DEFAULT_EMAIL_TEMPLATES.welcomeTitle
  );
  const [welcomeSubtitle, setWelcomeSubtitle] = useState(
    authSettings.welcomeEmailSubtitle || DEFAULT_EMAIL_TEMPLATES.welcomeSubtitle
  );
  const [welcomeBody, setWelcomeBody] = useState(
    authSettings.welcomeEmailBody || DEFAULT_EMAIL_TEMPLATES.welcomeBody
  );

  const [confirmationSubject, setConfirmationSubject] = useState(
    authSettings.confirmationEmailSubject || DEFAULT_EMAIL_TEMPLATES.confirmationSubject
  );
  const [confirmationTitle, setConfirmationTitle] = useState(
    authSettings.confirmationEmailTitle || DEFAULT_EMAIL_TEMPLATES.confirmationTitle
  );
  const [confirmationSubtitle, setConfirmationSubtitle] = useState(
    authSettings.confirmationEmailSubtitle || DEFAULT_EMAIL_TEMPLATES.confirmationSubtitle
  );
  const [confirmationBody, setConfirmationBody] = useState(
    authSettings.confirmationEmailBody || DEFAULT_EMAIL_TEMPLATES.confirmationBody
  );

  // Sync state whenever authSettings changes
  useEffect(() => {
    setWelcomeSubject(authSettings.welcomeEmailSubject || DEFAULT_EMAIL_TEMPLATES.welcomeSubject);
    setWelcomeTitle(authSettings.welcomeEmailTitle || DEFAULT_EMAIL_TEMPLATES.welcomeTitle);
    setWelcomeSubtitle(authSettings.welcomeEmailSubtitle || DEFAULT_EMAIL_TEMPLATES.welcomeSubtitle);
    setWelcomeBody(authSettings.welcomeEmailBody || DEFAULT_EMAIL_TEMPLATES.welcomeBody);

    setConfirmationSubject(
      authSettings.confirmationEmailSubject || DEFAULT_EMAIL_TEMPLATES.confirmationSubject
    );
    setConfirmationTitle(
      authSettings.confirmationEmailTitle || DEFAULT_EMAIL_TEMPLATES.confirmationTitle
    );
    setConfirmationSubtitle(
      authSettings.confirmationEmailSubtitle || DEFAULT_EMAIL_TEMPLATES.confirmationSubtitle
    );
    setConfirmationBody(
      authSettings.confirmationEmailBody || DEFAULT_EMAIL_TEMPLATES.confirmationBody
    );
  }, [authSettings]);

  if (!isOpen) return null;

  const c = APP_COLORS.classes;

  // Sample data for live preview
  const sampleData = {
    name: 'Ahmad Rahman',
    username: 'ahmad_r',
    email: 'ahmad.rahman@example.com',
    country: 'United Kingdom',
    city: 'London',
    appName: 'Allo Halal',
    code: '582910',
    link: 'https://allohalal.app/verify?token=preview_token',
    year: String(new Date().getFullYear()),
  };

  const handleInsertVariable = (variableKey: string) => {
    if (activeTab === 'welcome') {
      setWelcomeBody((prev) => `${prev} {${variableKey}}`);
    } else {
      setConfirmationBody((prev) => `${prev} {${variableKey}}`);
    }
    toast.info(`Inserted variable {${variableKey}} into email body.`, 'Variable Added');
  };

  const handleResetToDefault = () => {
    if (activeTab === 'welcome') {
      setWelcomeSubject(DEFAULT_EMAIL_TEMPLATES.welcomeSubject);
      setWelcomeTitle(DEFAULT_EMAIL_TEMPLATES.welcomeTitle);
      setWelcomeSubtitle(DEFAULT_EMAIL_TEMPLATES.welcomeSubtitle);
      setWelcomeBody(DEFAULT_EMAIL_TEMPLATES.welcomeBody);
      toast.info('Welcome email template reset to default values.', 'Template Reset');
    } else {
      setConfirmationSubject(DEFAULT_EMAIL_TEMPLATES.confirmationSubject);
      setConfirmationTitle(DEFAULT_EMAIL_TEMPLATES.confirmationTitle);
      setConfirmationSubtitle(DEFAULT_EMAIL_TEMPLATES.confirmationSubtitle);
      setConfirmationBody(DEFAULT_EMAIL_TEMPLATES.confirmationBody);
      toast.info('Confirmation email template reset to default values.', 'Template Reset');
    }
  };

  const handleSave = async () => {
    if (!onSaveAuthSettings || isSaving) return;
    setIsSaving(true);

    const updated: AuthSettings = {
      ...authSettings,
      id: 'global',
      welcomeEmailSubject: welcomeSubject.trim(),
      welcomeEmailTitle: welcomeTitle.trim(),
      welcomeEmailSubtitle: welcomeSubtitle.trim(),
      welcomeEmailBody: welcomeBody.trim(),
      confirmationEmailSubject: confirmationSubject.trim(),
      confirmationEmailTitle: confirmationTitle.trim(),
      confirmationEmailSubtitle: confirmationSubtitle.trim(),
      confirmationEmailBody: confirmationBody.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveAuthSettings(updated);
      toast.success(
        'Registration Welcome & Confirmation email templates saved successfully!',
        'Templates Saved'
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save email templates.', 'Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    const targetEmail = testEmailAddress.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address for testing.', 'Invalid Email');
      return;
    }

    setIsSendingTest(true);
    try {
      const payload = {
        toEmail: targetEmail,
        templateType: activeTab,
        subject: activeTab === 'welcome' ? welcomeSubject : confirmationSubject,
        title: activeTab === 'welcome' ? welcomeTitle : confirmationTitle,
        subtitle: activeTab === 'welcome' ? welcomeSubtitle : confirmationSubtitle,
        bodyText: activeTab === 'welcome' ? welcomeBody : confirmationBody,
      };

      const res = await fetch('/api/v1/auth/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send test email');
      }

      toast.success(
        `Test ${activeTab === 'welcome' ? 'Welcome' : 'Confirmation'} email delivered to ${targetEmail}! Check your inbox.`,
        'Test Email Sent'
      );
    } catch (err: any) {
      toast.error(err.message || 'Could not send test email. Ensure SMTP is configured.', 'Test Failed');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Live preview rendered strings
  const previewSubject = replaceEmailPlaceholders(
    activeTab === 'welcome' ? welcomeSubject : confirmationSubject,
    sampleData
  );
  const previewTitle = replaceEmailPlaceholders(
    activeTab === 'welcome' ? welcomeTitle : confirmationTitle,
    sampleData
  );
  const previewSubtitle = replaceEmailPlaceholders(
    activeTab === 'welcome' ? welcomeSubtitle : confirmationSubtitle,
    sampleData
  );
  const rawBody = activeTab === 'welcome' ? welcomeBody : confirmationBody;
  const parsedBody = replaceEmailPlaceholders(rawBody, sampleData);
  const previewParagraphs = parsedBody.split(/\n\s*\n/).filter(Boolean);

  const variablesList = [
    { key: 'name', label: 'Full Name ({name})' },
    { key: 'username', label: 'Username ({username})' },
    { key: 'email', label: 'Email ({email})' },
    { key: 'appName', label: 'App Name ({appName})' },
    { key: 'city', label: 'City ({city})' },
    { key: 'country', label: 'Country ({country})' },
    ...(activeTab === 'confirmation'
      ? [
          { key: 'code', label: 'Verification Code ({code})' },
          { key: 'link', label: 'Confirm Link ({link})' },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* 1. Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shadow-xs shrink-0`}>
              <Mail className="w-5 h-5 text-[#088839]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Registration Email Editor
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Welcome &amp; Confirmation
                </span>
                {authSettings.sendWelcomeEmail === false && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Emails Currently Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Customize titles, headers, and body content for transactional emails sent upon user registration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Top Tabs Switcher */}
        <div className="px-6 pt-3.5 pb-0 border-b border-slate-200 bg-white flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('welcome')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                activeTab === 'welcome'
                  ? 'border-[#088839] text-[#088839] bg-emerald-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#088839]" />
              <span>1. Welcome Email</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('confirmation')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                activeTab === 'confirmation'
                  ? 'border-[#088839] text-[#088839] bg-emerald-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>2. Confirmation Email</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 pb-2">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Preview Mode:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Desktop Layout Preview"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Mobile Screen Preview"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Mobile</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Main Workspace Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/50">
          
          {/* LEFT: Editor Fields (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Template Info Banner */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                {activeTab === 'welcome' ? (
                  <>
                    <strong className="text-slate-900 font-bold">Welcome Email:</strong> Sent immediately to users upon completing account registration. Welcomes the user, lists their profile information, and highlights key scanner capabilities.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-900 font-bold">Confirmation Email:</strong> Sent when email verification is required or requested. Contains a verification code and direct confirmation link to activate features.
                  </>
                )}
              </div>
            </div>

            {/* Inputs Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              
              {/* Field 1: Email Subject Line */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Email Subject Line</span>
                  <span className="text-[10px] text-slate-400 font-normal">Displayed in recipient inbox</span>
                </label>
                <input
                  type="text"
                  value={activeTab === 'welcome' ? welcomeSubject : confirmationSubject}
                  onChange={(e) =>
                    activeTab === 'welcome'
                      ? setWelcomeSubject(e.target.value)
                      : setConfirmationSubject(e.target.value)
                  }
                  placeholder={
                    activeTab === 'welcome'
                      ? 'Welcome to Allo Halal! Your Account is Ready'
                      : 'Confirm Your Allo Halal Account'
                  }
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none ${c.primaryFocus}`}
                />
              </div>

              {/* Field 2: Banner Title (Heading inside email) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Email Banner Title</span>
                  <span className="text-[10px] text-slate-400 font-normal">Prominent top heading</span>
                </label>
                <input
                  type="text"
                  value={activeTab === 'welcome' ? welcomeTitle : confirmationTitle}
                  onChange={(e) =>
                    activeTab === 'welcome'
                      ? setWelcomeTitle(e.target.value)
                      : setConfirmationTitle(e.target.value)
                  }
                  placeholder={
                    activeTab === 'welcome'
                      ? 'Welcome to Allo Halal!'
                      : 'Verify Your Email Address'
                  }
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none ${c.primaryFocus}`}
                />
              </div>

              {/* Field 3: Subtitle / Tagline */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Email Subtitle / Tagline</span>
                  <span className="text-[10px] text-slate-400 font-normal">Subtitle beneath banner title</span>
                </label>
                <input
                  type="text"
                  value={activeTab === 'welcome' ? welcomeSubtitle : confirmationSubtitle}
                  onChange={(e) =>
                    activeTab === 'welcome'
                      ? setWelcomeSubtitle(e.target.value)
                      : setConfirmationSubtitle(e.target.value)
                  }
                  placeholder="Your trusted AI-powered companion for verifying Halal products"
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none ${c.primaryFocus}`}
                />
              </div>

              {/* Field 4: Quick Dynamic Placeholders Insertion Bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Copy className="w-3 h-3 text-[#088839]" />
                    Insert Placeholders:
                  </span>
                  <span className="text-[10px] text-slate-400">Click to append to text</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {variablesList.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleInsertVariable(item.key)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-[11px] font-mono font-bold text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                      title={`Click to insert {${item.key}}`}
                    >
                      <span className="text-[#088839]">+</span>
                      <span>{'{' + item.key + '}'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 5: Email Body Message */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Email Body Text</span>
                  <span className="text-[10px] text-slate-400 font-normal">Line breaks create paragraphs</span>
                </label>
                <textarea
                  rows={6}
                  value={activeTab === 'welcome' ? welcomeBody : confirmationBody}
                  onChange={(e) =>
                    activeTab === 'welcome'
                      ? setWelcomeBody(e.target.value)
                      : setConfirmationBody(e.target.value)
                  }
                  placeholder="Assalamu Alaikum {name},\n\nThank you for joining Allo Halal!..."
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 font-medium leading-relaxed focus:bg-white focus:outline-none ${c.primaryFocus}`}
                />
              </div>
            </div>

            {/* Test Email Section Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Send Test Email
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Send this {activeTab === 'welcome' ? 'Welcome' : 'Confirmation'} template to your inbox via Gmail SMTP
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="recipient@example.com"
                  className={`flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none ${c.primaryFocus}`}
                />
                <button
                  type="button"
                  disabled={isSendingTest || !testEmailAddress}
                  onClick={handleSendTestEmail}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT: Live Interactive Preview Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col flex-1">
              
              {/* Preview Header Bar */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-[#088839]" />
                    Live Rendered Preview
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                  {sampleData.name} ({sampleData.email})
                </span>
              </div>

              {/* Subject line pill in preview */}
              <div className="px-4 py-2.5 border-b border-slate-100 bg-white text-xs">
                <span className="text-slate-400 font-semibold mr-1">Subject:</span>
                <span className="font-bold text-slate-900">{previewSubject || '(No subject provided)'}</span>
              </div>

              {/* Email Content Frame */}
              <div className="flex-1 p-4 bg-[#eef5f0] overflow-y-auto max-h-[620px]">
                <div
                  className={`mx-auto bg-white rounded-2xl overflow-hidden border border-[#d5e8dc] shadow-sm transition-all duration-200 ${
                    previewDevice === 'mobile' ? 'max-w-[340px]' : 'max-w-full'
                  }`}
                >
                  {/* Top Brand Banner */}
                  <div className="bg-gradient-to-br from-[#088839] to-[#055a25] p-6 text-center text-white">
                    <div className="w-13 h-13 mx-auto mb-3 rounded-2xl border-2 border-white/30 bg-[#088839] flex items-center justify-center shadow-xs">
                      <span className="text-xl font-black tracking-wider text-white">AH</span>
                    </div>
                    <div className="inline-block bg-white/20 border border-white/25 rounded-full px-3 py-0.5 mb-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-white">
                        {activeTab === 'welcome'
                          ? '✓ Registration Complete'
                          : '🔒 Email Verification Required'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight leading-snug">
                      {previewTitle || 'Welcome to Allo Halal!'}
                    </h3>
                    <p className="text-xs text-emerald-100 mt-1 font-medium leading-relaxed">
                      {previewSubtitle}
                    </p>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 text-slate-800 text-xs leading-relaxed space-y-3.5">
                    {previewParagraphs.length > 0 ? (
                      previewParagraphs.map((para, idx) => (
                        <p key={idx} className="text-slate-700 leading-relaxed">
                          {para}
                        </p>
                      ))
                    ) : (
                      <p className="text-slate-700 leading-relaxed">
                        Assalamu Alaikum <strong>{sampleData.name}</strong>,
                        <br />
                        Thank you for joining Allo Halal!
                      </p>
                    )}

                    {/* Specific tab section in preview */}
                    {activeTab === 'confirmation' ? (
                      <div className="my-4 p-4 rounded-xl bg-emerald-50 border-2 border-dashed border-emerald-300 text-center space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          One-Time Verification Code
                        </div>
                        <div className="text-2xl font-black tracking-widest text-[#088839] font-mono">
                          {sampleData.code}
                        </div>
                        <div className="pt-1">
                          <span className="inline-block px-4 py-2 rounded-xl bg-[#088839] text-white text-xs font-bold shadow-xs">
                            Confirm My Email Address &rarr;
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Welcome Profile Summary Card */
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/70 text-[11px] my-3">
                        <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 font-bold text-emerald-800 uppercase tracking-wider text-[10px]">
                          Account Profile Details
                        </div>
                        <div className="p-2.5 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Name</span>
                            <span className="font-bold text-slate-800">{sampleData.name}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 pt-1">
                            <span className="text-slate-500">Username</span>
                            <span className="font-bold text-[#088839]">@{sampleData.username}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 pt-1">
                            <span className="text-slate-500">Email</span>
                            <span className="font-medium text-slate-800">{sampleData.email}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 pt-1">
                            <span className="text-slate-500">Location</span>
                            <span className="text-slate-800">
                              {sampleData.city}, {sampleData.country}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mini Footer */}
                    <div className="pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
                      <p className="font-bold text-[#088839]">Allo Halal — Smart Halal Scanner</p>
                      <p>&copy; {new Date().getFullYear()} Allo Halal. All rights reserved.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* 4. Modal Action Bar Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset active template to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset {activeTab === 'welcome' ? 'Welcome' : 'Confirmation'} to Default</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl ${c.primaryBg} ${c.primaryBgHover} text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Email Templates'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
