'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  Loader2,
  X,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface ProductManagerProps {
  open: boolean;
  onClose: () => void;
}

interface Product {
  id: string | number;
  name: string;
  barcode?: string | null;
  category?: string | null;
  generic?: string | null;
  unitPrice: number;
  costPrice?: number | null;
  stock: number;
  unit: string;
  image?: string | null;
  batchNo?: string | null;
  expiryDate?: string | null;
}

interface FormState {
  name: string;
  barcode: string;
  category: string;
  generic: string;
  unitPrice: string;
  costPrice: string;
  stock: string;
  unit: string;
  batchNo: string;
  expiryDate: string;
}

const emptyForm: FormState = {
  name: '',
  barcode: '',
  category: '',
  generic: '',
  unitPrice: '',
  costPrice: '',
  stock: '0',
  unit: 'pcs',
  batchNo: '',
  expiryDate: '',
};

const formatTaka = (value: number) => `৳${(value || 0).toFixed(2)}`;

export default function ProductManager({ open, onClose }: ProductManagerProps) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');

  // Form state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [errors, setErrors] = React.useState<{ name?: string; unitPrice?: string }>({});
  const [saving, setSaving] = React.useState(false);

  const fetchProducts = React.useCallback(
    async (searchTerm: string, category: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (category) params.set('category', category);
        params.set('limit', '200');
        const res = await apiFetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        toast.error('Could not load products');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search & initial load
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      fetchProducts(search, categoryFilter);
    }, 300);
    return () => clearTimeout(t);
  }, [search, categoryFilter, open, fetchProducts]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category as string);
    });
    return Array.from(set).sort();
  }, [products]);

  const generics = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const g = (p as any).generic;
      if (g) set.add(g as string);
    });
    return Array.from(set).sort();
  }, [products]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      generic: (product as any).generic || '',
      unitPrice: product.unitPrice != null ? String(product.unitPrice) : '',
      costPrice:
        product.costPrice != null
          ? String(product.costPrice)
          : '',
      stock: product.stock != null ? String(product.stock) : '0',
      unit: product.unit || 'pcs',
      batchNo: product.batchNo || '',
      expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : '',
    });
    setErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const validate = (): boolean => {
    const nextErrors: { name?: string; unitPrice?: string } = {};
    if (!form.name.trim()) {
      nextErrors.name = 'Product name is required';
    }
    const price = parseFloat(form.unitPrice);
    if (form.unitPrice === '' || isNaN(price) || price < 0) {
      nextErrors.unitPrice = 'Valid unit price is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        barcode: form.barcode.trim() || undefined,
        category: form.category.trim() || undefined,
        generic: form.generic.trim() || undefined,
        unitPrice: parseFloat(form.unitPrice),
        costPrice:
          form.costPrice.trim() !== ''
            ? parseFloat(form.costPrice)
            : undefined,
        stock:
          form.stock.trim() !== '' ? parseFloat(form.stock) : 0,
        unit: form.unit.trim() || 'pcs',
        batchNo: form.batchNo.trim() || undefined,
        expiryDate: form.expiryDate || undefined,
      };

      if (editingId !== null) {
        const res = await apiFetch(`/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to update product');
        }
        toast.success('Product updated successfully');
      } else {
        const res = await apiFetch(`/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create product');
        }
        toast.success('Product added successfully');
      }
      closeForm();
      await fetchProducts(search, categoryFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete product');
      }
      toast.success('Product deleted');
      await fetchProducts(search, categoryFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(msg);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-background">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Package className="size-5 text-[#3FB98C]" />
            Product Manager
            <Badge
              variant="secondary"
              className="ml-1 bg-[#3FB98C]/10 text-[#2D9F73] border-[#3FB98C]/20"
            >
              {products.length} items
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Search + Add */}
        <div className="flex flex-col gap-2 p-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button
              onClick={openAddForm}
              className="bg-[#3FB98C] hover:bg-[#2D9F73] text-white"
            >
              <Plus className="size-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* List / Form area */}
        <div className="relative flex-1 min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-[#3FB98C]" />
                <span className="text-sm">Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Package className="size-10 opacity-40" />
                <p className="text-sm">No products found</p>
                <p className="text-xs">
                  Click &quot;Add Product&quot; to create one.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Generic</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const lowStock = Number(p.stock) <= 5;
                    const generic = (p as any).generic as string | undefined | null;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            {p.batchNo && (
                              <span className="text-[11px] text-muted-foreground">
                                Batch: {p.batchNo}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {p.barcode || '—'}
                        </TableCell>
                        <TableCell>
                          {p.category ? (
                            <Badge variant="outline" className="font-normal">
                              {p.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {generic ? (
                            <Badge variant="outline" className="font-normal border-[#3FB98C]/30 text-[#3FB98C] bg-[#3FB98C]/5">
                              {generic}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatTaka(Number(p.unitPrice))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={
                                lowStock
                                  ? 'text-destructive font-medium'
                                  : ''
                              }
                            >
                              {Number(p.stock).toLocaleString()}{' '}
                              <span className="text-xs text-muted-foreground">
                                {p.unit}
                              </span>
                            </span>
                            {lowStock && (
                              <span className="text-[10px] text-destructive">
                                Low stock
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditForm(p)}
                              title="Edit"
                              className="h-8 w-8"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(p)}
                              title="Delete"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Nested form overlay */}
          {formOpen && (
            <div className="absolute inset-0 z-20 flex flex-col bg-background">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="font-semibold text-base">
                  {editingId !== null ? 'Edit Product' : 'Add New Product'}
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={closeForm}
                  className="h-8 w-8"
                  title="Close form"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="pm-name">
                      Product Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pm-name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g. Coca-Cola 500ml"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pm-barcode">Barcode</Label>
                    <Input
                      id="pm-barcode"
                      value={form.barcode}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, barcode: e.target.value }))
                      }
                      placeholder="Scan or type barcode"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pm-category">Category</Label>
                    <Input
                      id="pm-category"
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      placeholder="e.g. Beverage"
                      list="pm-category-list"
                    />
                    <datalist id="pm-category-list">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <Label htmlFor="pm-generic">
                      Generic Name
                      <span className="ml-1 text-[10px] font-normal text-[#3FB98C]">(for ALT suggestions)</span>
                    </Label>
                    <Input
                      id="pm-generic"
                      value={form.generic}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, generic: e.target.value }))
                      }
                      placeholder="e.g. Paracetamol, Esomeprazole"
                      list="pm-generic-list"
                    />
                    <datalist id="pm-generic-list">
                      {generics.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Products with the same Generic name appear as alternatives in the cart.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pm-unitPrice">
                      Unit Price (৳) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pm-unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.unitPrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, unitPrice: e.target.value }))
                      }
                      placeholder="0.00"
                      aria-invalid={!!errors.unitPrice}
                    />
                    {errors.unitPrice && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.unitPrice}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pm-costPrice">Cost Price (৳)</Label>
                    <Input
                      id="pm-costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.costPrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, costPrice: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pm-stock">Stock</Label>
                    <Input
                      id="pm-stock"
                      type="number"
                      step="1"
                      min="0"
                      value={form.stock}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, stock: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pm-unit">Unit</Label>
                    <Input
                      id="pm-unit"
                      value={form.unit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, unit: e.target.value }))
                      }
                      placeholder="pcs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pm-batchNo">Batch No.</Label>
                    <Input
                      id="pm-batchNo"
                      value={form.batchNo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, batchNo: e.target.value }))
                      }
                      placeholder="e.g. LOT-2024-001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pm-expiryDate">Expiry Date</Label>
                    <Input
                      id="pm-expiryDate"
                      type="date"
                      value={form.expiryDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expiryDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Save button bar */}
              <div className="flex-shrink-0 flex items-center justify-end gap-2 p-4 border-t bg-muted/30 sticky bottom-0 z-10">
                <Button variant="outline" onClick={closeForm} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#3FB98C] hover:bg-[#2D9F73] text-white min-w-[120px]"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {editingId !== null ? 'Update Product' : 'Save Product'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="border-t p-4 flex-row justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Daowa POS · Bangladesh
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
