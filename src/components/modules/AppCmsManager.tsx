'use client';

import React, { useState, useEffect } from 'react';
import { CmsSettings, CmsTexts } from '@/lib/types';
import { DEFAULT_CMS_TEXTS } from '@/lib/storage';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';
import {
  FileText,
  RotateCcw,
  Save,
  Sparkles,
  Home,
  Layers,
  ShieldCheck,
  HelpCircle,
  Info,
  Scale,
  Mail,
  Globe,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface AppCmsManagerProps {
  settings: CmsSettings;
  onSave: (settings: CmsSettings) => Promise<void>;
  currentAdminName?: string;
}

type CmsSectionTab = 'legal' | 'home' | 'onboarding';
type LegalSubTab = 'privacy' | 'help' | 'about' | 'terms';

const GDPR_PRESET_TEMPLATES = {
  privacyFr: {
    title: 'Politique de confidentialité (RGPD)',
    content: `Dernière mise à jour : Octobre 2026\nConforme au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679)\n\n1. Responsable du Traitement\nL'application Allo Halal est éditée par Allo Halal. Nous accordons une importance primordiale à la confidentialité et à la sécurité de vos données personnelles.\nPour toute question relative à la protection de vos données ou pour contacter notre Délégué à la Protection des Données (DPO) :\n• E-mail : support@allohalal.fr\n• Site officiel : www.allohalal.fr\n\n2. Données Personnelles Collectées\nNous collectons uniquement les informations strictement nécessaires aux fonctionnalités de l'application :\n• Données de compte : Nom complet, nom d'utilisateur, adresse e-mail, pays et ville renseignés lors de l'inscription.\n• Données d'utilisation : Historique des produits scannés et liste de favoris (conservés localement et synchronisés de manière chiffrée si vous êtes connecté).\n• Données techniques : Modèle d'appareil, version du système d'exploitation et identifiant anonymisé de diagnostic.\n• Accès Caméra : Sollicité uniquement pour le scan de codes-barres ou la prise de photo des étiquettes d'ingrédients. Les images envoyées à notre IA Vision pour analyse ne sont jamais conservées de manière permanente sur nos serveurs.\n\n3. Finalités et Bases Légales du Traitement (Art. 6 RGPD)\n• Fourniture du service d'analyse d'ingrédients et gestion de votre compte (Art. 6.1.b - Exécution contractuelle).\n• Notifications d'alertes alimentaires ou mises à jour importantes (Art. 6.1.a - Consentement).\n• Sécurisation des accès et prévention des abus (Art. 6.1.f - Intérêt légitime).\n\n4. Confidentialité et Destinataires des Données\n• Vos données personnelles ne sont JAMAIS vendues, louées ou partagées avec des régies publicitaires tierces.\n• Toutes les communications sont chiffrées selon le protocole TLS 1.3 / SSL via des serveurs sécurisés situés dans l'Union Européenne.\n\n5. Durée de Conservation\n• Les données de votre profil sont conservées tant que votre compte reste actif. Vous pouvez à tout moment demander leur effacement total.\n• L'historique local peut être purgé immédiatement depuis les paramètres de votre application.\n\n6. Vos Droits sous le RGPD (Articles 15 à 22)\nConformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :\n• Droit d'accès et d'information (Art. 15)\n• Droit de rectification (Art. 16)\n• Droit à l'effacement / « Droit à l'oubli » (Art. 17)\n• Droit à la limitation du traitement (Art. 18)\n• Droit à la portabilité de vos données (Art. 20)\n• Droit d'opposition (Art. 21)\n\nPour exercer vos droits, écrivez simplement à : support@allohalal.fr. Nous vous répondrons dans un délai maximal de 30 jours.\n\n7. Réclamation auprès de l'Autorité de Contrôle (CNIL)\nSi vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés - France : www.cnil.fr).`,
  },
  privacyEn: {
    title: 'Privacy Policy (GDPR Compliant)',
    content: `Last Updated: October 2026\nCompliant with the General Data Protection Regulation (GDPR - EU 2016/679)\n\n1. Data Controller\nThe Allo Halal mobile application is operated by Allo Halal. Protecting your personal data and privacy is our top priority.\nFor any inquiries or to contact our Data Protection Officer (DPO):\n• Email: support@allohalal.fr\n• Website: www.allohalal.fr\n\n2. Personal Data We Collect\nWe only collect data strictly necessary for providing our halal verification services:\n• Account Profile: Full name, username, email address, country, and city provided upon registration.\n• Usage Data: Scan history and saved favorite products (stored locally and synced securely if signed in).\n• Technical Diagnostics: Device model, operating system version, and anonymized diagnostic logs.\n• Camera Access: Used exclusively for scanning barcodes and taking photos of ingredient labels. Images sent to our Vision AI are analyzed in real time and never permanently stored on servers.\n\n3. Legal Basis for Processing (GDPR Article 6)\n• Service Delivery & Account Management (Art. 6.1.b - Contractual necessity).\n• Important Food Alerts & Notifications (Art. 6.1.a - User consent).\n• Platform Security & AI Accuracy (Art. 6.1.f - Legitimate interests).\n\n4. Zero Data Selling & EU Hosting\n• Your personal data is NEVER sold, rented, or monetized with third-party advertisers.\n• All network transmissions are protected using end-to-end TLS 1.3 encryption on secure EU-based servers.\n\n5. Your Rights Under GDPR (Articles 15-22)\n• Right of access, rectification, erasure ("Right to be Forgotten"), restriction, data portability, and objection.\n• To exercise any of your privacy rights, email our team at: support@allohalal.fr (response within 30 days).\n• You also have the right to lodge a complaint with your supervisory authority (such as CNIL in France).`,
  },
  helpFr: {
    title: 'Aide et support',
    content: `Besoin d'aide ou des suggestions ? L'équipe Allo Halal s'engage à vous offrir la meilleure expérience.\n\nSujets d'assistance courants :\n• Signaler des résultats incorrects : L'IA peut parfois se tromper. Si vous remarquez un statut erroné pour un produit, transmettez-nous le code-barres et la photo de l'étiquette par e-mail.\n• Produit introuvable : Si le produit n'est pas encore répertorié dans la base, utilisez la fonction "Scanner Ingrédients" pour analyser directement la liste des ingrédients grâce à l'IA Vision.\n• Problèmes de connexion ou lenteurs : Vérifiez votre accès internet. Les analyses d'ingrédients avancées sont traitées instantanément via nos serveurs cloud sécurisés.\n• Gestion du compte et des données : Pour modifier vos informations de profil ou demander la suppression de votre compte (conformité RGPD), envoyez un message à notre support.\n\nNous contacter :\n• E-mail d'assistance : support@allohalal.fr\n• Site officiel : www.allohalal.fr\n• Centre d'aide & FAQ : allohalal.fr/faq\n\nNotre équipe d'assistance répond généralement dans un délai de 24 à 48 heures ouvrées. Vos retours nous aident à améliorer Allo Halal pour toute la communauté !`,
  },
  aboutFr: {
    title: "À propos d'Allo Halal",
    content: `Allo Halal est un assistant de vérification Halal de nouvelle génération propulsé par l'intelligence artificielle, spécialement conçu pour les consommateurs musulmans exigeants.\n\nÀ l'ère de chaînes agroalimentaires mondialisées et de listes d'ingrédients de plus en plus complexes (additifs E, dérivés animaux cachés, gélatines, arômes), vérifier la conformité halal d'un aliment peut s'avérer fastidieux. Allo Halal combine une IA de pointe et une immense base de données mondiale pour vous apporter une réponse claire, instantanée et sourcée.\n\nFonctionnalités clés :\n• Analyse IA Avancée : Utilisation des derniers modèles Llama 3 Vision de Groq AI pour décrypter les étiquettes alimentaires en temps réel.\n• Base de Données Mondiale : Accès à plus de 3 millions de produits certifiés et analysés grâce à Open Food Facts et nos partenaires.\n• Dictionnaire des Additifs (E-Numbers) : Explications détaillées sur plus de 500 additifs avec avis des écoles juridiques islamiques (Halal, Haram, Mushbooh).\n• Scanner Vision OCR : Prenez en photo n'importe quelle liste d'ingrédients en magasin ; l'IA la traduit et identifie les composants suspects en quelques millisecondes.\n• 100 % Respectueux de votre Vie Privée : Architecture Privacy-First, stricte conformité RGPD européenne.\n\nNotre mission : Vous offrir transparence, sérénité et autonomie dans vos choix alimentaires quotidiens.`,
  },
  termsFr: {
    title: "Conditions Générales d'Utilisation",
    content: `Conditions Générales d'Utilisation (CGU)\nDernière mise à jour : Octobre 2026\n\n1. Objet et Acceptation\nLes présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de l'application mobile Allo Halal. L'utilisation de l'application implique l'acceptation sans réserve des présentes conditions.\n\n2. Nature Indicative des Analyses IA\nL'application fournit des analyses de statut Halal basées sur la reconnaissance automatique d'images (OCR) et des modèles d'intelligence artificielle. Ces analyses sont fournies à titre purement indicatif et consultatif. Bien que nous nous efforcions d'assurer une exactitude maximale, l'utilisateur est invité à vérifier directement les étiquettes et à se référer aux organismes officiels de certification halal en cas de doute.\n\n3. Propriété Intellectuelle\nTous les contenus, logos, graphismes et logiciels composant Allo Halal sont la propriété exclusive d'Allo Halal et sont protégés par les lois internationales sur la propriété intellectuelle.\n\n4. Comportement des Utilisateurs\nL'utilisateur s'engage à utiliser l'application dans le respect des lois en vigueur et à ne pas tenter de perturber le fonctionnement des serveurs ou d'extraire des données de manière automatisée.\n\n5. Mises à Jour en Temps Réel\nAllo Halal se réserve le droit de modifier les présentes CGU à tout moment. Toute modification est immédiatement synchronisée dans l'application via notre système CMS.\n\nContact légal : support@allohalal.fr`,
  },
};

export const AppCmsManager: React.FC<AppCmsManagerProps> = ({
  settings,
  onSave,
  currentAdminName,
}) => {
  const [texts, setTexts] = useState<CmsTexts>({
    ...DEFAULT_CMS_TEXTS,
    ...(settings?.texts || {}),
  });
  const [activeSection, setActiveSection] = useState<CmsSectionTab>('legal');
  const [activeLegalTab, setActiveLegalTab] = useState<LegalSubTab>('privacy');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.texts) {
      setTexts({
        ...DEFAULT_CMS_TEXTS,
        ...settings.texts,
      });
    }
  }, [settings]);

  const handleChange = (key: keyof CmsTexts, value: string) => {
    setTexts((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...settings,
        id: 'global',
        texts,
        updatedAt: new Date().toISOString(),
        updatedBy: currentAdminName || 'Admin',
      });
      toast.success('App UI texts and Legal Pages published successfully.', 'CMS Published');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save CMS texts.', 'Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all UI texts back to original default values?')) {
      setTexts(DEFAULT_CMS_TEXTS);
      toast.info('Restored default texts. Click Save & Publish to apply.', 'Defaults Restored');
    }
  };

  const applyTemplate = (type: 'privacyFr' | 'privacyEn' | 'helpFr' | 'aboutFr' | 'termsFr') => {
    const tmpl = GDPR_PRESET_TEMPLATES[type];
    if (!tmpl) return;

    if (type === 'privacyFr' || type === 'privacyEn') {
      handleChange('privacyTitle', tmpl.title);
      handleChange('privacyContent', tmpl.content);
    } else if (type === 'helpFr') {
      handleChange('helpTitle', tmpl.title);
      handleChange('helpContent', tmpl.content);
    } else if (type === 'aboutFr') {
      handleChange('aboutTitle', tmpl.title);
      handleChange('aboutContent', tmpl.content);
    } else if (type === 'termsFr') {
      handleChange('termsTitle', tmpl.title);
      handleChange('termsContent', tmpl.content);
    }
    toast.success('Template applied. Click Save & Publish to apply live.', 'Template Loaded');
  };

  const getActiveLegalStats = () => {
    let content = '';
    let title = '';
    if (activeLegalTab === 'privacy') {
      title = texts.privacyTitle;
      content = texts.privacyContent;
    } else if (activeLegalTab === 'help') {
      title = texts.helpTitle;
      content = texts.helpContent;
    } else if (activeLegalTab === 'about') {
      title = texts.aboutTitle;
      content = texts.aboutContent;
    } else if (activeLegalTab === 'terms') {
      title = texts.termsTitle || "Conditions d'utilisation";
      content = texts.termsContent || '';
    }
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    return { title, content, words, chars };
  };

  const currentStats = getActiveLegalStats();
  const c = APP_COLORS.classes;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Master Top Action Card (Standard HalalLens Admin Header Pattern) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border shadow-xs`}
          >
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Legal Pages & App CMS
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${c.primaryBadge}`}
              >
                Live Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Manage Help, About, Privacy Policy (GDPR), and UI copy live across the mobile app without app store updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl ${c.primaryBg} ${c.primaryBgHover} text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer`}
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* 2. Primary Navigation Pills (Standard HalalLens Tab Pattern) */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveSection('legal')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeSection === 'legal'
              ? `${c.primaryBg} text-white font-bold shadow-2xs`
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Legal Pages & Help (GDPR)
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('home')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeSection === 'home'
              ? `${c.primaryBg} text-white font-bold shadow-2xs`
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Home & Hero
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('onboarding')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeSection === 'onboarding'
              ? `${c.primaryBg} text-white font-bold shadow-2xs`
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Onboarding & Auth
        </button>
      </div>

      {/* 3. Section Content */}
      <div className="space-y-6">
        {/* SECTION A: LEGAL PAGES & HELP (GDPR COMPLIANCE) */}
        {activeSection === 'legal' && (
          <div className="space-y-6">
            {/* Top GDPR Compliance Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border shadow-2xs`}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                        European GDPR / RGPD Compliance (UE 2016/679) & CNIL
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.primaryBadge}`}
                      >
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-2xl">
                      European regulations require explicit disclosures for user privacy rights, data processing basis (Art. 6), right to erasure (Art. 17), and a direct contact channel for the Data Protection Officer (<code className="text-[#088839] font-bold">support@allohalal.fr</code>).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-[#088839]" />
                    <span>DPO: support@allohalal.fr</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>www.allohalal.fr</span>
                  </div>
                </div>
              </div>

              {/* Status Feature Checklist */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#088839]" />
                  <span>Right to Access & Rectify</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#088839]" />
                  <span>Right to Erasure (Art. 17)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#088839]" />
                  <span>TLS 1.3 / SSL Encryption</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#088839]" />
                  <span>Zero 3rd-Party Data Sale</span>
                </div>
              </div>
            </div>

            {/* Legal Pages Sub-Tabs Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveLegalTab('privacy')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLegalTab === 'privacy'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#088839]" />
                  Privacy Policy (RGPD)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLegalTab('help')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLegalTab === 'help'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  Help & Support
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLegalTab('about')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLegalTab === 'about'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  About Allo Halal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLegalTab('terms')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLegalTab === 'terms'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 text-purple-600" />
                  Terms of Service (CGU)
                </button>
              </div>

              <div className="flex items-center gap-2 pr-1">
                <span className="text-xs text-slate-500 font-medium font-mono">
                  {currentStats.words} words • {currentStats.chars} chars
                </span>
              </div>
            </div>

            {/* Legal Page Main Form Card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0`}
                  >
                    {activeLegalTab === 'privacy' && <ShieldCheck className="w-4 h-4" />}
                    {activeLegalTab === 'help' && <HelpCircle className="w-4 h-4" />}
                    {activeLegalTab === 'about' && <Info className="w-4 h-4" />}
                    {activeLegalTab === 'terms' && <Scale className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeLegalTab === 'privacy' && 'Politique de Confidentialité (Conformité RGPD)'}
                      {activeLegalTab === 'help' && "Centre d'Aide & Support"}
                      {activeLegalTab === 'about' && "À Propos d'Allo Halal"}
                      {activeLegalTab === 'terms' && "Conditions Générales d'Utilisation (CGU)"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Changes are synchronized directly to mobile client settings via Supabase
                    </p>
                  </div>
                </div>

                {/* Quick Template Actions */}
                <div className="flex items-center gap-2">
                  {activeLegalTab === 'privacy' && (
                    <>
                      <button
                        type="button"
                        onClick={() => applyTemplate('privacyFr')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Load GDPR (FR)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('privacyEn')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Load GDPR (EN)
                      </button>
                    </>
                  )}
                  {activeLegalTab === 'help' && (
                    <button
                      type="button"
                      onClick={() => applyTemplate('helpFr')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Load Help Template
                    </button>
                  )}
                  {activeLegalTab === 'about' && (
                    <button
                      type="button"
                      onClick={() => applyTemplate('aboutFr')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Load About Template
                    </button>
                  )}
                  {activeLegalTab === 'terms' && (
                    <button
                      type="button"
                      onClick={() => applyTemplate('termsFr')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Load Terms Template
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Page Title (App bar heading in mobile screen)
                  </label>
                  <input
                    type="text"
                    value={
                      activeLegalTab === 'privacy'
                        ? texts.privacyTitle
                        : activeLegalTab === 'help'
                        ? texts.helpTitle
                        : activeLegalTab === 'about'
                        ? texts.aboutTitle
                        : texts.termsTitle || "Conditions d'utilisation"
                    }
                    onChange={(e) => {
                      if (activeLegalTab === 'privacy') handleChange('privacyTitle', e.target.value);
                      else if (activeLegalTab === 'help') handleChange('helpTitle', e.target.value);
                      else if (activeLegalTab === 'about') handleChange('aboutTitle', e.target.value);
                      else if (activeLegalTab === 'terms') handleChange('termsTitle', e.target.value);
                    }}
                    className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none ${c.primaryFocus} transition-all`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Full Content Text
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Plain text with line breaks and bullet points (•)
                    </span>
                  </div>
                  <textarea
                    rows={14}
                    value={
                      activeLegalTab === 'privacy'
                        ? texts.privacyContent
                        : activeLegalTab === 'help'
                        ? texts.helpContent
                        : activeLegalTab === 'about'
                        ? texts.aboutContent
                        : texts.termsContent || ''
                    }
                    onChange={(e) => {
                      if (activeLegalTab === 'privacy') handleChange('privacyContent', e.target.value);
                      else if (activeLegalTab === 'help') handleChange('helpContent', e.target.value);
                      else if (activeLegalTab === 'about') handleChange('aboutContent', e.target.value);
                      else if (activeLegalTab === 'terms') handleChange('termsContent', e.target.value);
                    }}
                    className={`w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 font-normal leading-relaxed focus:outline-none ${c.primaryFocus} transition-all whitespace-pre-wrap font-sans`}
                  />
                </div>

                {/* Footer Pill Status Bar */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
                    <span>Support: <strong className="text-slate-900">support@allohalal.fr</strong></span>
                    <span>Website: <strong className="text-slate-900">www.allohalal.fr</strong></span>
                    <span>FAQ: <strong className="text-slate-900">allohalal.fr/faq</strong></span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${c.primaryBadge}`}>
                    Synced to Supabase
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION B: HOME & HERO SECTION */}
        {activeSection === 'home' && (
          <div className="space-y-6">
            {/* Brand & Home Screen Hero Card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-white">
                <div
                  className={`w-9 h-9 rounded-xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0`}
                >
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Brand &amp; Home Screen Hero
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Main title, subtitle, and primary scan button texts shown on the mobile home screen
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      App Brand Title
                    </label>
                    <input
                      type="text"
                      value={texts.appName}
                      onChange={(e) => handleChange('appName', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Splash Screen Tagline
                    </label>
                    <input
                      type="text"
                      value={texts.splashSubtitle}
                      onChange={(e) => handleChange('splashSubtitle', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Home Hero Description
                  </label>
                  <textarea
                    rows={2}
                    value={texts.heroSubtitle}
                    onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                    className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Primary Barcode Button
                    </label>
                    <input
                      type="text"
                      value={texts.scanBarcodeBtn}
                      onChange={(e) => handleChange('scanBarcodeBtn', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ingredients Scan Button
                    </label>
                    <input
                      type="text"
                      value={texts.analyzeTextBtn}
                      onChange={(e) => handleChange('analyzeTextBtn', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Manual Entry Link Text
                    </label>
                    <input
                      type="text"
                      value={texts.manualEntryBtn}
                      onChange={(e) => handleChange('manualEntryBtn', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Home Feature Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-white">
                <div
                  className={`w-9 h-9 rounded-xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Home Screen Feature Highlights (3 Cards)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Customize the 3 feature highlight rows displayed in the middle of the mobile home screen
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {[
                  {
                    num: 1,
                    titleKey: 'feature1Title' as keyof CmsTexts,
                    descKey: 'feature1Desc' as keyof CmsTexts,
                    badge: 'Feature 1 (Barcode)',
                  },
                  {
                    num: 2,
                    titleKey: 'feature2Title' as keyof CmsTexts,
                    descKey: 'feature2Desc' as keyof CmsTexts,
                    badge: 'Feature 2 (Ingredients OCR)',
                  },
                  {
                    num: 3,
                    titleKey: 'feature3Title' as keyof CmsTexts,
                    descKey: 'feature3Desc' as keyof CmsTexts,
                    badge: 'Feature 3 (AI Results)',
                  },
                ].map((f) => (
                  <div
                    key={f.num}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {f.badge} — Title
                      </label>
                      <input
                        type="text"
                        value={texts[f.titleKey]}
                        onChange={(e) => handleChange(f.titleKey, e.target.value)}
                        className={`w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {f.badge} — Description
                      </label>
                      <input
                        type="text"
                        value={texts[f.descKey]}
                        onChange={(e) => handleChange(f.descKey, e.target.value)}
                        className={`w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION C: ONBOARDING & AUTH */}
        {activeSection === 'onboarding' && (
          <div className="space-y-6">
            {/* Onboarding Slides Card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-white">
                <div
                  className={`w-9 h-9 rounded-xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Onboarding Walkthrough Slides (1 – 4)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Presented to users when installing and opening the app for the first time
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {[
                  {
                    slide: 1,
                    titleKey: 'onboarding1Title' as keyof CmsTexts,
                    descKey: 'onboarding1Desc' as keyof CmsTexts,
                  },
                  {
                    slide: 2,
                    titleKey: 'onboarding2Title' as keyof CmsTexts,
                    descKey: 'onboarding2Desc' as keyof CmsTexts,
                  },
                  {
                    slide: 3,
                    titleKey: 'onboarding3Title' as keyof CmsTexts,
                    descKey: 'onboarding3Desc' as keyof CmsTexts,
                  },
                  {
                    slide: 4,
                    titleKey: 'onboarding4Title' as keyof CmsTexts,
                    descKey: 'onboarding4Desc' as keyof CmsTexts,
                  },
                ].map((s) => (
                  <div
                    key={s.slide}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#088839]">
                        Slide #{s.slide}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={texts[s.titleKey]}
                          onChange={(e) => handleChange(s.titleKey, e.target.value)}
                          className={`w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={texts[s.descKey]}
                          onChange={(e) => handleChange(s.descKey, e.target.value)}
                          className={`w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth & AI Analysis Texts Card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-white">
                <div
                  className={`w-9 h-9 rounded-xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Authentication &amp; AI Analysis Texts
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Headings and disclaimers on Login, Register, Image Scan, and Result screens
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Login Screen Heading
                    </label>
                    <input
                      type="text"
                      value={texts.loginTitle}
                      onChange={(e) => handleChange('loginTitle', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Login Screen Subtitle
                    </label>
                    <input
                      type="text"
                      value={texts.loginSubtitle}
                      onChange={(e) => handleChange('loginSubtitle', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Register Screen Heading
                    </label>
                    <input
                      type="text"
                      value={texts.registerTitle}
                      onChange={(e) => handleChange('registerTitle', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Register Screen Subtitle
                    </label>
                    <input
                      type="text"
                      value={texts.registerSubtitle}
                      onChange={(e) => handleChange('registerSubtitle', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Image Analysis Screen Title
                    </label>
                    <input
                      type="text"
                      value={texts.textScanTitle}
                      onChange={(e) => handleChange('textScanTitle', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Image Analysis Subtitle
                    </label>
                    <input
                      type="text"
                      value={texts.textScanSubtitle}
                      onChange={(e) => handleChange('textScanSubtitle', e.target.value)}
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scan Result AI Disclaimer Notice
                  </label>
                  <textarea
                    rows={2}
                    value={texts.resultDisclaimer}
                    onChange={(e) => handleChange('resultDisclaimer', e.target.value)}
                    className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                  />
                </div>
              </div>
            </div>

            {/* Registration Email Customization (Welcome & Confirmation) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Registration Emails (Welcome &amp; Confirmation)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Customize titles, subjects, and text for transactional registration emails
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Welcome Email Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#088839]" />
                    <h4 className="text-xs font-bold text-slate-900">1. Welcome Email</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Welcome Email Subject
                      </label>
                      <input
                        type="text"
                        value={texts.welcomeEmailSubject || ''}
                        onChange={(e) => handleChange('welcomeEmailSubject', e.target.value)}
                        placeholder="Welcome to Allo Halal! Your Account is Ready"
                        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Welcome Email Banner Title
                      </label>
                      <input
                        type="text"
                        value={texts.welcomeEmailTitle || ''}
                        onChange={(e) => handleChange('welcomeEmailTitle', e.target.value)}
                        placeholder="Welcome to Allo Halal!"
                        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Welcome Email Body Text
                    </label>
                    <textarea
                      rows={3}
                      value={texts.welcomeEmailBody || ''}
                      onChange={(e) => handleChange('welcomeEmailBody', e.target.value)}
                      placeholder="Assalamu Alaikum {name},\n\nThank you for joining the Allo Halal community!..."
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                </div>

                {/* Confirmation Email Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900">2. Confirmation Email</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirmation Email Subject
                      </label>
                      <input
                        type="text"
                        value={texts.confirmationEmailSubject || ''}
                        onChange={(e) => handleChange('confirmationEmailSubject', e.target.value)}
                        placeholder="Confirm Your Allo Halal Account"
                        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirmation Email Banner Title
                      </label>
                      <input
                        type="text"
                        value={texts.confirmationEmailTitle || ''}
                        onChange={(e) => handleChange('confirmationEmailTitle', e.target.value)}
                        placeholder="Verify Your Email Address"
                        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirmation Email Body Text
                    </label>
                    <textarea
                      rows={3}
                      value={texts.confirmationEmailBody || ''}
                      onChange={(e) => handleChange('confirmationEmailBody', e.target.value)}
                      placeholder="Assalamu Alaikum {name},\n\nThank you for registering with Allo Halal! To verify your email address..."
                      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none ${c.primaryFocus} transition-all`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
