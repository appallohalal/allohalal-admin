'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Product,
  UnknownProduct,
  UnknownProductStatus,
  ProductErrorReport,
} from '@/lib/types';
import {
  fetchUnknownProducts,
  updateUnknownProduct,
  deleteUnknownProduct,
  fetchErrorReports,
  updateErrorReport,
} from '@/lib/storage';
import { getRolePermissions } from '@/lib/permissions';
import { toast } from '@/lib/toast';
import { APP_COLORS } from '@/lib/colors';
import { ProductPrefillData } from './ProductCatalog';
import {
  HelpCircle,
  Barcode,
  Camera,
  Eye,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bell,
  Link2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  User,
} from 'lucide-react';

interface UnknownProductsManagerProps {
  products: Product[];
  currentUserRole?: string;
  currentAdminName?: string;
  searchQuery: string;
  onCreateProductFromUnknown: (prefill: ProductPrefillData) => void;
  onRefreshTrigger?: number;
}

const STATUS_META: Record<
  UnknownProductStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  nouveau: {
    label: 'Nouveau',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  en_cours: {
    label: 'En cours de traitement',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  traite: {
    label: 'Traité',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  rejete: {
    label: 'Rejeté',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const UnknownProductsManager: React.FC<UnknownProductsManagerProps> = ({
  products,
  currentUserRole = 'Super Admin',
  currentAdminName = 'Admin',
  searchQuery,
  onCreateProductFromUnknown,
  onRefreshTrigger,
}) => {
  const c = APP_COLORS.classes;
  const perms = getRolePermissions(currentUserRole);

  const [subTab, setSubTab] = useState<'UNKNOWN' | 'REPORTS'>('UNKNOWN');
  const [items, setItems] = useState<UnknownProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [statusFilter, setStatusFilter] = useState<'ALL' | UnknownProductStatus>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<UnknownProduct | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [statusInput, setStatusInput] = useState<UnknownProductStatus>('nouveau');
  const [linkBarcodeInput, setLinkBarcodeInput] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Error Reports state
  const [reports, setReports] = useState<ProductErrorReport[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [unknownRes, reportsRes] = await Promise.all([
        fetchUnknownProducts({
          status: statusFilter,
          search: searchQuery,
          page,
          limit,
        }),
        fetchErrorReports(),
      ]);
      setItems(unknownRes.items);
      setTotal(unknownRes.total);
      setReports(reportsRes);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    void loadData();
  }, [loadData, onRefreshTrigger]);

  const openDetails = (item: UnknownProduct) => {
    setSelectedItem(item);
    setNotesInput(item.notes || '');
    setStatusInput(item.status);
    setLinkBarcodeInput('');
  };

  const handleSaveStatus = async () => {
    if (!selectedItem) return;
    let linkedId: string | undefined;
    if (linkBarcodeInput.trim()) {
      const match = products.find(
        (p) =>
          p.barcode === linkBarcodeInput.trim() ||
          p.id === linkBarcodeInput.trim()
      );
      if (!match) {
        toast.error('Aucun produit existant trouvé pour ce code-barres.', 'Lien introuvable');
        return;
      }
      linkedId = match.id;
    }

    const ok = await updateUnknownProduct({
      id: selectedItem.id,
      status: linkedId ? 'traite' : statusInput,
      notes: notesInput,
      linkedProductId: linkedId,
    });

    if (ok) {
      toast.success('Statut mis à jour.', 'Produit inconnu');
      setSelectedItem(null);
      await loadData();
    } else {
      toast.error('Impossible de mettre à jour.', 'Erreur');
    }
  };

  const handleDelete = async (item: UnknownProduct) => {
    if (!confirm(`Supprimer le produit inconnu ${item.barcode} ?`)) return;
    const ok = await deleteUnknownProduct(item.id);
    if (ok) {
      toast.success('Entrée supprimée.');
      await loadData();
    }
  };

  const handleUpdateReportStatus = async (
    report: ProductErrorReport,
    status: 'nouveau' | 'traite' | 'rejete'
  ) => {
    const ok = await updateErrorReport({
      id: report.id,
      status,
      reviewedBy: currentAdminName,
    });
    if (ok) {
      toast.success('Signalement mis à jour.');
      await loadData();
    }
  };

  const countPhotos = (u: UnknownProduct) => {
    let n = 0;
    if (u.frontImageUrl) n++;
    if (u.ingredientsImageUrl) n++;
    if (u.certifierImageUrl) n++;
    return n;
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pendingReportsCount = reports.filter((r) => r.status === 'nouveau').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
          >
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Produits inconnus &amp; Signalements
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Consultez les codes-barres scannés absents de la base et créez les fiches produits à partir des photos des utilisateurs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab('UNKNOWN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'UNKNOWN'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Produits inconnus ({isLoading && total === 0 ? '...' : total})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('REPORTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'REPORTS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Signalements ({pendingReportsCount})</span>
          </button>
        </div>
      </div>

      {subTab === 'UNKNOWN' && (
        <>
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'ALL', label: 'Tous' },
                  { id: 'nouveau', label: 'Nouveau' },
                  { id: 'en_cours', label: 'En cours de traitement' },
                  { id: 'traite', label: 'Traité' },
                  { id: 'rejete', label: 'Rejeté' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? `${c.primaryBg} text-white shadow-2xs`
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {total} code(s)-barres enregistré(s)
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Code-barres</th>
                    <th className="py-3.5 px-4 text-center">Scans</th>
                    <th className="py-3.5 px-4 text-center">Demandes</th>
                    <th className="py-3.5 px-4 text-center">Photos</th>
                    <th className="py-3.5 px-4">1er scan</th>
                    <th className="py-3.5 px-4">Dernier scan</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        Chargement des produits inconnus...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        Aucun produit inconnu pour ce filtre.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const meta = STATUS_META[item.status] || STATUS_META.nouveau;
                      const photoCount = countPhotos(item);
                      const thumb = item.frontImageUrl || item.ingredientsImageUrl;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={item.barcode}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                              <div className="font-mono text-xs font-bold text-slate-900">
                                {item.barcode}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-xs">
                            {item.scansCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-xs text-blue-700">
                            {item.submissionsCount}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                              <Camera className="w-3 h-3 text-slate-500" />
                              {photoCount}/3
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(item.firstScannedAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(item.lastScannedAt).toLocaleString('fr-FR')}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDetails(item)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Détails</span>
                              </button>
                              {perms.canAddProduct && item.status !== 'traite' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onCreateProductFromUnknown({
                                      barcode: item.barcode,
                                      imageUrl: item.frontImageUrl || '',
                                      unknownProductId: item.id,
                                    })
                                  }
                                  className={`px-2.5 py-1.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${c.primaryBg} ${c.primaryBgHover}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Créer</span>
                                </button>
                              )}
                              {perms.canDeleteUnknownProducts && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {page} / {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Préc.
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    Suiv. <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === 'REPORTS' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Produit / Code-barres</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Aucun signalement d&apos;erreur pour le moment.
                    </td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rep.productName || 'Produit'}</div>
                        <div className="font-mono text-[11px] text-slate-500">{rep.barcode}</div>
                      </td>
                      <td className="py-3.5 px-4 capitalize font-semibold">{rep.reportType}</td>
                      <td className="py-3.5 px-4 max-w-sm text-slate-600">{rep.message}</td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(rep.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            rep.status === 'traite'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : rep.status === 'rejete'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateReportStatus(rep, 'traite')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold cursor-pointer"
                          >
                            Traité
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateReportStatus(rep, 'rejete')}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold cursor-pointer"
                          >
                            Rejeté
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unknown Product Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-emerald-600" />
                  <span>Produit inconnu — {selectedItem.barcode}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedItem.scansCount} scan(s) • {selectedItem.submissionsCount} soumission(s) • Premier scan le{' '}
                  {new Date(selectedItem.firstScannedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submitted Photos Grid */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                Photos soumises
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: '1. Face avant', url: selectedItem.frontImageUrl },
                  { label: '2. Ingrédients', url: selectedItem.ingredientsImageUrl },
                  { label: '3. Logo certification', url: selectedItem.certifierImageUrl },
                ].map((photo) => (
                  <div
                    key={photo.label}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2"
                  >
                    <div className="text-[11px] font-bold text-slate-700">{photo.label}</div>
                    {photo.url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(photo.url!)}
                        className="w-full h-36 rounded-lg overflow-hidden border border-slate-200 bg-white block cursor-pointer hover:opacity-90"
                      >
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-full h-36 rounded-lg border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-[11px] text-slate-400">
                        <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                        Non fournie
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* User Submissions List */}
            {selectedItem.submissions && selectedItem.submissions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Historique des soumissions ({selectedItem.submissions.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                  {selectedItem.submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {sub.userEmail || sub.deviceId || 'Anonyme'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          • {new Date(sub.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      {sub.notifyWhenReady && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Bell className="w-3 h-3" />
                          {sub.notifiedAt ? 'Notifié' : 'À prévenir'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Actions: Status, Link to Existing Product, Create Product */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Statut de traitement
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as UnknownProductStatus)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  <option value="nouveau">Nouveau</option>
                  <option value="en_cours">En cours de traitement</option>
                  <option value="traite">Traité</option>
                  <option value="rejete">Rejeté</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lier à un produit existant (Code-barres)</span>
                </label>
                <input
                  type="text"
                  value={linkBarcodeInput}
                  onChange={(e) => setLinkBarcodeInput(e.target.value)}
                  placeholder="ex. 3512690000019 (optionnel)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              {perms.canAddProduct ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedItem;
                    setSelectedItem(null);
                    onCreateProductFromUnknown({
                      barcode: target.barcode,
                      imageUrl: target.frontImageUrl || '',
                      unknownProductId: target.id,
                    });
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer ${c.primaryBg} ${c.primaryBgHover}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer la fiche produit</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer le statut</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-[70] bg-slate-900/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewPhotoUrl}
            alt="Aperçu"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
