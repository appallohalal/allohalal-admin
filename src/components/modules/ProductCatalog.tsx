'use client';

import React, { useState } from 'react';
import { Product, HalalStatus } from '@/lib/types';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Edit3,
  Edit2,
  Trash2,
  Plus,
  Barcode,
  Sparkles,
  Filter,
  Check,
  X,
  PackageSearch,
  PackagePlus,
  Image as ImageIcon,
  Building2,
  FileText,
  FlaskConical,
  UserCheck,
} from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onUpdateStatus: (
    productId: string,
    status: HalalStatus,
    note: string,
    verifiedBy: string
  ) => void;
  onSaveProduct?: (product: Product) => Promise<void> | void;
  onDeleteProduct?: (productId: string) => Promise<void> | void;
  currentAdminName?: string;
  searchQuery: string;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onUpdateStatus,
  onSaveProduct,
  onDeleteProduct,
  currentAdminName = 'Senior Halal Auditor',
  searchQuery,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | HalalStatus | 'OVERRIDDEN'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Add / Full Edit Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [fullEditProduct, setFullEditProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);

  // Full Product Form State
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredientsRaw, setIngredientsRaw] = useState('');
  const [additivesInput, setAdditivesInput] = useState('');
  const [productStatus, setProductStatus] = useState<HalalStatus>('HALAL');
  const [productNote, setProductNote] = useState('');
  const [productVerifiedBy, setProductVerifiedBy] = useState(currentAdminName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Override Modal State
  const [selectedStatus, setSelectedStatus] = useState<HalalStatus>('HALAL');
  const [moderatorNote, setModeratorNote] = useState('');
  const [verifiedBy, setVerifiedBy] = useState(currentAdminName);

  const c = APP_COLORS.classes;
  const inputCls = `w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all placeholder:text-slate-400`;

  const openCreateModal = () => {
    setFullEditProduct(null);
    setBarcode('');
    setName('');
    setBrand('');
    setImageUrl('');
    setIngredientsRaw('');
    setAdditivesInput('');
    setProductStatus('HALAL');
    setProductNote('Manually verified and added by Halal Auditor');
    setProductVerifiedBy(currentAdminName);
    setIsProductModalOpen(true);
  };

  const openFullEditModal = (p: Product) => {
    setFullEditProduct(p);
    setBarcode(p.barcode);
    setName(p.name);
    setBrand(p.brand);
    setImageUrl(p.imageUrl || '');
    setIngredientsRaw(p.ingredientsRaw);
    setAdditivesInput((p.detectedAdditives || []).join(', '));
    setProductStatus(p.manualStatus || p.aiStatus || 'HALAL');
    setProductNote(p.moderatorNote || '');
    setProductVerifiedBy(p.verifiedBy || currentAdminName);
    setIsProductModalOpen(true);
  };

  const openOverrideModal = (p: Product) => {
    setEditingProduct(p);
    setSelectedStatus(p.manualStatus || p.aiStatus);
    setModeratorNote(p.moderatorNote || '');
    setVerifiedBy(p.verifiedBy || currentAdminName);
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onUpdateStatus(editingProduct.id, selectedStatus, moderatorNote, verifiedBy);
    toast.success(
      `Status for "${editingProduct.name}" updated to ${selectedStatus}.`,
      'Override Saved'
    );
    setEditingProduct(null);
  };

  const handleSaveFullProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveProduct) return;

    const cleanBarcode = barcode.trim();
    const cleanName = name.trim();
    if (!cleanBarcode || !cleanName) {
      toast.error('Barcode and Product Name are required.', 'Missing Fields');
      return;
    }

    const parsedAdditives = additivesInput
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const newProduct: Product = {
      id: fullEditProduct ? fullEditProduct.id : `prod-${Date.now()}`,
      barcode: cleanBarcode,
      name: cleanName,
      brand: brand.trim() || 'Unknown Brand',
      imageUrl: imageUrl.trim() || undefined,
      ingredientsRaw: ingredientsRaw.trim(),
      detectedAdditives: parsedAdditives,
      aiStatus: fullEditProduct ? fullEditProduct.aiStatus : productStatus,
      manualStatus: productStatus,
      isOverridden: true,
      moderatorNote:
        productNote.trim() || `Verified as ${productStatus} by ${productVerifiedBy.trim()}`,
      verifiedBy: productVerifiedBy.trim() || currentAdminName,
      scansCount: fullEditProduct ? fullEditProduct.scansCount : 0,
      lastScannedAt: new Date().toISOString(),
      createdAt: fullEditProduct ? fullEditProduct.createdAt : new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSaveProduct(newProduct);
      toast.success(
        fullEditProduct
          ? `Product "${cleanName}" updated successfully.`
          : `Product "${cleanName}" (${cleanBarcode}) added to database.`,
        fullEditProduct ? 'Product Updated' : 'Product Added'
      );
      setIsProductModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product.', 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmProduct || !onDeleteProduct) return;
    await onDeleteProduct(deleteConfirmProduct.id);
    toast.success(`Product "${deleteConfirmProduct.name}" removed.`, 'Product Deleted');
    setDeleteConfirmProduct(null);
  };

  // Filter products
  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode.includes(searchQuery) ||
      p.ingredientsRaw.toLowerCase().includes(q);

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
    <div className="space-y-6 pb-16">
      {/* 1. Top Header Banner with "+ Add New Product" Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
          >
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Product Catalog & Moderation
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`}
              >
                {products.length} Products
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Add new products by barcode or override AI verdicts for mobile scanner users
            </p>
          </div>
        </div>

        {onSaveProduct && (
          <button
            type="button"
            onClick={openCreateModal}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-98 ${c.primaryBg} ${c.primaryBgHover}`}
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* 2. Filters and Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? `${c.primaryBg} text-white shadow-2xs`
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('HALAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'HALAL'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Halal ({products.filter((p) => (p.manualStatus || p.aiStatus) === 'HALAL').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('HARAM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'HARAM'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            Haram ({products.filter((p) => (p.manualStatus || p.aiStatus) === 'HARAM').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('MUSHBOOH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'MUSHBOOH'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            Mushbooh (
            {products.filter((p) => (p.manualStatus || p.aiStatus) === 'MUSHBOOH').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OVERRIDDEN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'OVERRIDDEN'
                ? 'bg-[#e6f4eb] text-[#066d2e] border border-[#b5e0c5]'
                : 'text-slate-600 hover:text-[#066d2e] hover:bg-[#e6f4eb]'
            }`}
          >
            Manually Verified ({products.filter((p) => p.isOverridden).length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> products
        </div>
      </div>

      {/* 3. Product List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Barcode</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">E-Numbers</th>
                <th className="py-3.5 px-4">Ingredients</th>
                <th className="py-3.5 px-4 text-center">Scans</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <PackageSearch className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Add New Product" to manually add a product by barcode, or scan from the
                      mobile app.
                    </p>
                    {onSaveProduct && (
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className={`mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer ${c.primaryBg} ${c.primaryBgHover}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product</span>
                      </button>
                    )}
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
                            src={
                              product.imageUrl ||
                              'https://placehold.co/80x80/f1f5f9/64748b?text=Allo+Halal'
                            }
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate group-hover:text-[#088839] transition-colors">
                              {product.name}
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {product.brand}
                            </div>
                            {product.isOverridden && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-[#066d2e] bg-[#e6f4eb] px-1.5 py-0.5 rounded-md border border-[#b5e0c5]">
                                <Sparkles className="w-3 h-3" /> Verified by {product.verifiedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-700">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-fit font-medium">
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                          {product.barcode}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div>{getStatusBadge(currentStatus)}</div>
                          {product.isOverridden &&
                            product.manualStatus &&
                            product.manualStatus !== product.aiStatus && (
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
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-mono font-semibold text-slate-700 border border-slate-200"
                              >
                                {e}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>

                      {/* Raw Ingredients Snippet */}
                      <td className="py-4 px-4 max-w-xs">
                        <p
                          className="text-xs text-slate-600 line-clamp-2 leading-relaxed"
                          title={product.ingredientsRaw}
                        >
                          {product.ingredientsRaw || '—'}
                        </p>
                      </td>

                      {/* Scans Count */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {product.scansCount.toLocaleString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openOverrideModal(product)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder} hover:bg-blue-100`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Override</span>
                          </button>

                          {onSaveProduct && (
                            <button
                              type="button"
                              onClick={() => openFullEditModal(product)}
                              className="inline-flex items-center justify-center p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              title="Edit product details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onDeleteProduct && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmProduct(product)}
                              className="inline-flex items-center justify-center p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                              title="Delete product"
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
      </div>

      {/* 4. ADD / EDIT FULL PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
                >
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {fullEditProduct ? 'Edit Product Details' : 'Add New Product'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Enter barcode, brand, ingredients, and verified halal status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFullProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Barcode */}
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Barcode (EAN / UPC) *</span>
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 8941100512345"
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>

                {/* Brand Name */}
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Brand Name *</span>
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Pran / Nestlé / Al-Islami"
                    className={inputCls}
                    required
                  />
                </div>

                {/* Product Name */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <PackagePlus className="w-3.5 h-3.5 text-slate-400" />
                    <span>Product Name *</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Roasted Vermicelli / Dark Chocolate Bar 100g"
                    className={inputCls}
                    required
                  />
                </div>

                {/* Product Image URL & E-Numbers */}
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Product Image URL (Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
                    <span>E-Numbers / Additives (Comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={additivesInput}
                    onChange={(e) => setAdditivesInput(e.target.value)}
                    placeholder="e.g. E322, E471, E330"
                    className={`${inputCls} font-mono`}
                  />
                </div>

                {/* Ingredients Raw */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ingredients List *</span>
                  </label>
                  <textarea
                    rows={3}
                    value={ingredientsRaw}
                    onChange={(e) => setIngredientsRaw(e.target.value)}
                    placeholder="Wheat flour, sugar, vegetable oil (palm), soy lecithin (E322), salt..."
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* Halal Status Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Halal Compliance Status *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setProductStatus('HALAL')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      productStatus === 'HALAL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HALAL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductStatus('MUSHBOOH')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      productStatus === 'MUSHBOOH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>MUSHBOOH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductStatus('HARAM')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      productStatus === 'HARAM'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>HARAM</span>
                  </button>
                </div>
              </div>

              {/* Auditor Note & Verified By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    <span>Verification Note</span>
                  </label>
                  <input
                    type="text"
                    value={productNote}
                    onChange={(e) => setProductNote(e.target.value)}
                    placeholder="e.g. Certified 100% Halal by BSTI / JAKIM"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Verified By</span>
                  </label>
                  <input
                    type="text"
                    value={productVerifiedBy}
                    onChange={(e) => setProductVerifiedBy(e.target.value)}
                    placeholder="Senior Halal Auditor"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50 ${c.primaryBg} ${c.primaryBgHover}`}
                >
                  <Check className="w-4 h-4" />
                  <span>{fullEditProduct ? 'Save Changes' : 'Add Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. QUICK OVERRIDE MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`}
                >
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Manual Halal Status Override
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Correct AI OCR false positives or specify official halal certification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
              <img
                src={
                  editingProduct.imageUrl ||
                  'https://placehold.co/80x80/f1f5f9/64748b?text=Product'
                }
                alt={editingProduct.name}
                className="w-14 h-14 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {editingProduct.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Brand: <span className="font-semibold text-slate-700">{editingProduct.brand}</span>{' '}
                  • Barcode:{' '}
                  <span className="font-mono text-slate-700">{editingProduct.barcode}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Current AI Verdict:{' '}
                  <span className="font-bold text-slate-800">{editingProduct.aiStatus}</span>
                </div>
              </div>
            </div>

            {/* Raw Ingredients Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Raw Ingredients:</label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 max-h-24 overflow-y-auto leading-relaxed">
                {editingProduct.ingredientsRaw || 'No ingredients listed'}
              </div>
            </div>

            {/* Override Form */}
            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Assign Final Status:</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('HALAL')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedStatus === 'HALAL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    HALAL
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('MUSHBOOH')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedStatus === 'MUSHBOOH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    MUSHBOOH
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('HARAM')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedStatus === 'HARAM'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    HARAM
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Technical & Shariah Justification:
                </label>
                <textarea
                  rows={3}
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  placeholder="Explain why this status was chosen (e.g. verified plant-derived lecithin, certified by HFCE)..."
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Auditor / Certifier Name:
                </label>
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${c.primaryBg} ${c.primaryBgHover}`}
                >
                  <Check className="w-4 h-4" />
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE PRODUCT CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Product?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove{' '}
                  <span className="font-bold text-slate-700">"{deleteConfirmProduct.name}"</span> (
                  {deleteConfirmProduct.barcode}) from the catalog?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
