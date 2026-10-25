'use client';

import React, { useState } from 'react';
import { Additive, HalalStatus } from '@/lib/types';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/languages';
import {
  BookOpenCheck,
  Plus,
  Edit2,
  Trash2,
  Globe2,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Download,
  Search,
  X,
  Check,
  Languages,
} from 'lucide-react';

interface AdditivesDictionaryProps {
  additives: Additive[];
  onSaveAdditive: (additive: Additive) => void;
  onDeleteAdditive: (id: string) => void;
  searchQuery: string;
}

export const AdditivesDictionary: React.FC<AdditivesDictionaryProps> = ({
  additives,
  onSaveAdditive,
  onDeleteAdditive,
  searchQuery,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdditive, setEditingAdditive] = useState<Additive | null>(null);
  const [activeLangCode, setActiveLangCode] = useState<string>('en');

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formStatus, setFormStatus] = useState<HalalStatus>('MUSHBOOH');
  const [formSource, setFormSource] = useState<Additive['source']>('Doubtful');
  const [formCategory, setFormCategory] = useState('');
  const [formTranslations, setFormTranslations] = useState<Additive['translations']>({});

  const openNewModal = () => {
    setEditingAdditive(null);
    setFormCode('E');
    setFormNameEn('');
    setFormStatus('MUSHBOOH');
    setFormSource('Doubtful');
    setFormCategory('Emulsifier / Preservative');
    
    // Seed default structure for 14 languages
    const initialTrans: Additive['translations'] = {};
    SUPPORTED_LANGUAGES.forEach((lang) => {
      initialTrans[lang.code] = {
        name: '',
        description: '',
        halalReason: '',
      };
    });
    setFormTranslations(initialTrans);
    setActiveLangCode('en');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Additive) => {
    setEditingAdditive(item);
    setFormCode(item.code);
    setFormNameEn(item.nameEn);
    setFormStatus(item.status);
    setFormSource(item.source);
    setFormCategory(item.category || '');
    
    // Ensure all 14 languages exist in translations map
    const transCopy = { ...item.translations };
    SUPPORTED_LANGUAGES.forEach((lang) => {
      if (!transCopy[lang.code]) {
        transCopy[lang.code] = {
          name: '',
          description: '',
          halalReason: '',
        };
      }
    });
    setFormTranslations(transCopy);
    setActiveLangCode('en');
    setIsModalOpen(true);
  };

  const handleTranslationChange = (
    langCode: string,
    field: 'name' | 'description' | 'halalReason',
    value: string
  ) => {
    setFormTranslations((prev) => ({
      ...prev,
      [langCode]: {
        ...(prev[langCode] || { name: '', description: '', halalReason: '' }),
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAdditive: Additive = {
      id: editingAdditive ? editingAdditive.id : `add-${Date.now()}`,
      code: formCode.toUpperCase().trim(),
      nameEn: formNameEn.trim(),
      status: formStatus,
      source: formSource,
      category: formCategory.trim(),
      translations: formTranslations,
      updatedAt: new Date().toISOString(),
    };

    onSaveAdditive(newAdditive);
    setIsModalOpen(false);
  };

  const exportForFlutter = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(additives, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'halallens_additives_14lang.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter
  const filtered = additives.filter((a) => {
    const query = searchQuery.toLowerCase();
    return (
      a.code.toLowerCase().includes(query) ||
      a.nameEn.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query) ||
      a.source.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: HalalStatus) => {
    switch (status) {
      case 'HALAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Halal
          </span>
        );
      case 'HARAM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Haram
          </span>
        );
      case 'MUSHBOOH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Mushbooh
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> Unknown
          </span>
        );
    }
  };

  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === activeLangCode) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <BookOpenCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Additives & E-Numbers Dictionary
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                14 Languages
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Manage international codes, sources, and localized Shariah rulings for mobile offline sync.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportForFlutter}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Mobile JSON
          </button>

          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Add New E-Number
          </button>
        </div>
      </div>

      {/* Additives Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">E-Code</th>
                <th className="py-3.5 px-4">Additive Name (English)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Source / Origin</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">14-Lang Coverage</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <BookOpenCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No E-Numbers added yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click the "Add New E-Number" button above to register an additive in Supabase.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const translatedCount = SUPPORTED_LANGUAGES.filter(
                  (l) => item.translations[l.code]?.halalReason?.trim()
                ).length;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* E-Code */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
                        {item.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-4 px-4 font-bold text-slate-900 max-w-xs">
                      {item.nameEn}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>

                    {/* Source */}
                    <td className="py-4 px-4 text-xs font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {item.source}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 text-xs text-slate-500 font-medium">{item.category}</td>

                    {/* Language Coverage */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-2 border border-slate-200 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{
                              width: `${(translatedCount / SUPPORTED_LANGUAGES.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 font-bold">
                          {translatedCount}/14
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
                          title="Edit Translations"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${item.code}?`)) {
                              onDeleteAdditive(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                          title="Delete Additive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD & 14-LANGUAGE TRANSLATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAdditive ? `Edit ${editingAdditive.code} (${editingAdditive.nameEn})` : 'Add New E-Number'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure technical properties and multi-language Shariah rulings across 14 languages.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Core Properties */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">E-Number Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. E120"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Name (English)</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="e.g. Carmine / Cochineal"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Halal Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as HalalStatus)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="HALAL">HALAL</option>
                    <option value="HARAM">HARAM</option>
                    <option value="MUSHBOOH">MUSHBOOH</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Source / Origin</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value as Additive['source'])}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Animal">Animal (Gelatin / Pork / Insect)</option>
                    <option value="Plant">Plant (Vegetable / Fruit)</option>
                    <option value="Synthetic">Synthetic (Chemical synthesis)</option>
                    <option value="Microbial">Microbial (Bacterial fermentation)</option>
                    <option value="Doubtful">Doubtful (Could be plant or animal)</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Colouring, Emulsifier, Preservative"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 14-LANGUAGE TABBED EDITOR */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      14 Languages Technical & Shariah Justification
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Active: <span className="text-emerald-700 font-bold">{activeLangObj.name} ({activeLangObj.nativeName})</span>
                  </span>
                </div>

                {/* Language Pills Tab Bar */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isTranslated = Boolean(formTranslations[lang.code]?.halalReason?.trim());
                    const isActive = activeLangCode === lang.code;

                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setActiveLangCode(lang.code)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs font-bold'
                            : isTranslated
                            ? 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
                            : 'bg-white text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.code.toUpperCase()}</span>
                        {isTranslated && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                {/* Form Fields for Active Language */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Local Name ({activeLangObj.name} - {activeLangObj.nativeName}):
                    </label>
                    <input
                      type="text"
                      value={formTranslations[activeLangCode]?.name || ''}
                      onChange={(e) => handleTranslationChange(activeLangCode, 'name', e.target.value)}
                      placeholder={`Localized name for ${formCode || 'additive'}...`}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Technical Chemical Description ({activeLangObj.name}):
                    </label>
                    <textarea
                      rows={2}
                      value={formTranslations[activeLangCode]?.description || ''}
                      onChange={(e) => handleTranslationChange(activeLangCode, 'description', e.target.value)}
                      placeholder="Manufacturing process, extraction source, and chemical purpose..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Islamic / Shariah Halal Justification ({activeLangObj.name}):</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Displayed in mobile scan results</span>
                    </label>
                    <textarea
                      rows={3}
                      value={formTranslations[activeLangCode]?.halalReason || ''}
                      onChange={(e) => handleTranslationChange(activeLangCode, 'halalReason', e.target.value)}
                      placeholder="Fatwa, jurisprudence rulings (Hanafi, Shafi'i, etc.), and reasons for Halal/Haram/Mushbooh status..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Additive Dictionary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
