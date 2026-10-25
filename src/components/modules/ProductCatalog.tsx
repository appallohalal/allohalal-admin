'use client';

import React, { useState } from 'react';
import { Product, HalalStatus } from '@/lib/types';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Edit3,
  ExternalLink,
  Barcode,
  Sparkles,
  Filter,
  Check,
  X,
  History,
  Layers,
  PackageSearch,
} from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onUpdateStatus: (
    productId: string,
    status: HalalStatus,
    note: string,
    verifiedBy: string
  ) => void;
  searchQuery: string;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onUpdateStatus,
  searchQuery,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | HalalStatus | 'OVERRIDDEN'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state for quick edit modal
  const [selectedStatus, setSelectedStatus] = useState<HalalStatus>('HALAL');
  const [moderatorNote, setModeratorNote] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('Sheikh Amin (Mufti)');

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSelectedStatus(p.manualStatus || p.aiStatus);
    setModeratorNote(p.moderatorNote || '');
    setVerifiedBy(p.verifiedBy || 'Senior Halal Auditor');
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onUpdateStatus(editingProduct.id, selectedStatus, moderatorNote, verifiedBy);
    setEditingProduct(null);
  };

  // Filter products
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.ingredientsRaw.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERRIDDEN') return p.isOverridden;
    return (p.manualStatus || p.aiStatus) === statusFilter;
  });

  const getStatusBadge = (status: HalalStatus) => {
    switch (status) {
      case 'HALAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Halal
          </span>
        );
      case 'HARAM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Haram
          </span>
        );
      case 'MUSHBOOH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Mushbooh
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter('HALAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'HALAL'
                ? 'bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Halal ({products.filter((p) => (p.manualStatus || p.aiStatus) === 'HALAL').length})
          </button>
          <button
            onClick={() => setStatusFilter('HARAM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'HARAM'
                ? 'bg-rose-100 text-rose-800 font-semibold border border-rose-200'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            Haram ({products.filter((p) => (p.manualStatus || p.aiStatus) === 'HARAM').length})
          </button>
          <button
            onClick={() => setStatusFilter('MUSHBOOH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'MUSHBOOH'
                ? 'bg-amber-100 text-amber-800 font-semibold border border-amber-200'
                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            Mushbooh ({products.filter((p) => (p.manualStatus || p.aiStatus) === 'MUSHBOOH').length})
          </button>
          <button
            onClick={() => setStatusFilter('OVERRIDDEN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'OVERRIDDEN'
                ? 'bg-purple-100 text-purple-800 font-semibold border border-purple-200'
                : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
            }`}
          >
            Manually Moderated ({products.filter((p) => p.isOverridden).length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> scanned products
        </div>
      </div>

      {/* Product List Table / Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Barcode</th>
                <th className="py-3.5 px-4">AI Verdict vs Manual</th>
                <th className="py-3.5 px-4">Detected E-Numbers</th>
                <th className="py-3.5 px-4">Raw Ingredients OCR</th>
                <th className="py-3.5 px-4 text-center">Scans</th>
                <th className="py-3.5 px-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <PackageSearch className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No scanned products found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Scanned items from the Flutter mobile app will automatically sync here.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const currentStatus = product.manualStatus || product.aiStatus;

                  return (
                    <tr
                    key={product.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Product Name & Brand */}
                    <td className="py-4 px-4 min-w-[240px]">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.imageUrl || 'https://placehold.co/80x80/f1f5f9/64748b?text=Halal'}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                            {product.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {product.brand}
                          </div>
                          {product.isOverridden && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              <Sparkles className="w-3 h-3" /> Overridden by {product.verifiedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-700">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 w-fit font-medium">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        {product.barcode}
                      </div>
                    </td>

                    {/* AI Verdict vs Manual */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{getStatusBadge(currentStatus)}</div>
                        {product.isOverridden && product.manualStatus !== product.aiStatus && (
                          <div className="text-[10px] text-slate-400 line-through">
                            AI was: {product.aiStatus}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Detected Additives */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {product.detectedAdditives.length > 0 ? (
                          product.detectedAdditives.map((e) => (
                            <span
                              key={e}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-mono font-medium text-slate-700 border border-slate-200"
                            >
                              {e}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">None detected</span>
                        )}
                      </div>
                    </td>

                    {/* Raw Ingredients OCR Snippet */}
                    <td className="py-4 px-4 max-w-xs">
                      <p
                        className="text-xs text-slate-600 line-clamp-2 leading-relaxed"
                        title={product.ingredientsRaw}
                      >
                        {product.ingredientsRaw}
                      </p>
                    </td>

                    {/* Scans Count */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="font-bold text-slate-900 text-xs">
                        {product.scansCount.toLocaleString()}
                      </span>
                    </td>

                    {/* Quick Edit Action Button */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(product)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-all hover:scale-105 active:scale-95 shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Quick Override
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK OVERRIDE MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Manual Halal Status Override
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Correct Groq AI OCR false positives or specify Islamic ruling.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
              <img
                src={editingProduct.imageUrl || 'https://placehold.co/80x80/f1f5f9/64748b?text=Product'}
                alt={editingProduct.name}
                className="w-14 h-14 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {editingProduct.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Brand: <span className="font-medium text-slate-700">{editingProduct.brand}</span> • Barcode: <span className="font-mono text-slate-700">{editingProduct.barcode}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Current AI Verdict: <span className="font-bold text-slate-800">{editingProduct.aiStatus}</span>
                </div>
              </div>
            </div>

            {/* Raw Ingredients Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Raw Ingredients (From OCR / OpenFoodFacts):
              </label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 max-h-24 overflow-y-auto leading-relaxed">
                {editingProduct.ingredientsRaw}
              </div>
            </div>

            {/* Override Form */}
            <form onSubmit={handleSaveOverride} className="space-y-4">
              {/* Select Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Assign Final Status:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('HALAL')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      selectedStatus === 'HALAL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    HALAL
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('MUSHBOOH')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      selectedStatus === 'MUSHBOOH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    MUSHBOOH
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('HARAM')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      selectedStatus === 'HARAM'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    HARAM
                  </button>
                </div>
              </div>

              {/* Justification & Shariah Reasoning */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Technical & Shariah Justification (Displayed to Users in App):
                </label>
                <textarea
                  rows={3}
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  placeholder="Explain why this status was chosen (e.g. verified plant-derived lecithin, certified by HFCE, non-dhabihah meat risk, etc.)..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Verified By / Auditor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Auditor / Certifier Name:
                </label>
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save & Publish Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
