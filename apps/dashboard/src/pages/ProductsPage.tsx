import { useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Button,
  Card,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Coffee, Edit, Plus, Search, Trash2, Utensils } from 'lucide-react';
import type { MasterMenuItemRecord } from '@sharon/shared';
import { ImageUpload } from '../components/shared/ImageUpload';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useOutletsQuery } from '../hooks/useOutletHooks';
import {
  useCategoriesQuery,
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useUpdateProductMutation,
} from '../hooks/useProductHooks';
import type { CreateProductPayload, UpdateProductPayload } from '../services/product.service';
import { extractApiErrorMessage } from '../utils/errorMessage';

interface ProductFormData {
  name: string;
  slug?: string;
  categorySlug: string;
  newCategoryName?: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isVegetarian: boolean;
  isBestseller: boolean;
  sortOrder: number;
  isActive: boolean;
  outletBusinessIds: string[];
  customPrice?: number | null;
}

export function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 350);

  const categoriesQuery = useCategoriesQuery();
  const outletsQuery = useOutletsQuery(true);
  const productsQuery = useProductsQuery({
    categorySlug: selectedCategory === 'ALL' ? undefined : selectedCategory,
    search: debouncedSearch || undefined,
  });

  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const deleteMutation = useDeleteProductMutation();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<MasterMenuItemRecord | null>(null);
  const isSubmittingAddRef = useRef(false);

  const addForm = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      slug: '',
      categorySlug: 'teas',
      description: '',
      price: 15,
      imageUrl: null,
      isVegetarian: true,
      isBestseller: false,
      sortOrder: 0,
      isActive: true,
      outletBusinessIds: ['ALL'],
      customPrice: null,
    },
  });

  const editForm = useForm<ProductFormData>();

  const handleOpenAdd = () => {
    addForm.reset({
      name: '',
      slug: '',
      categorySlug: categoriesQuery.data?.[0]?.slug || 'teas',
      description: '',
      price: 15,
      imageUrl: null,
      isVegetarian: true,
      isBestseller: false,
      sortOrder: 0,
      isActive: true,
      outletBusinessIds: ['ALL'],
      customPrice: null,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (product: MasterMenuItemRecord) => {
    setEditingProduct(product);
    editForm.reset({
      name: product.name,
      slug: product.slug,
      categorySlug: product.categorySlug,
      description: product.description || '',
      price: product.price,
      imageUrl: product.imageUrl,
      isVegetarian: product.isVegetarian,
      isBestseller: product.isBestseller,
      sortOrder: product.sortOrder,
      isActive: product.isActive,
      outletBusinessIds: ['ALL'],
      customPrice: null,
    });
  };

  const onAddSubmit = async (values: ProductFormData) => {
    if (isSubmittingAddRef.current) return;
    isSubmittingAddRef.current = true;
    try {
      const payload: CreateProductPayload = {
        name: values.name,
        slug: values.slug || undefined,
        categorySlug: values.categorySlug,
        description: values.description || null,
        price: Number(values.price),
        imageUrl: values.imageUrl || null,
        isVegetarian: values.isVegetarian,
        isBestseller: values.isBestseller,
        sortOrder: Number(values.sortOrder || 0),
        isActive: values.isActive,
        outletBusinessIds: values.outletBusinessIds,
        customPrice: values.customPrice ? Number(values.customPrice) : null,
      };

      const created = await createMutation.mutateAsync(payload);
      message.success(`Product "${created.name}" created and configured!`);
      setIsAddModalOpen(false);
      addForm.reset();
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to create product.'),
      );
    } finally {
      isSubmittingAddRef.current = false;
    }
  };

  const onEditSubmit = async (values: ProductFormData) => {
    if (!editingProduct) return;
    try {
      const payload: UpdateProductPayload = {
        name: values.name,
        slug: values.slug || undefined,
        categorySlug: values.categorySlug,
        description: values.description || null,
        price: Number(values.price),
        imageUrl: values.imageUrl || null,
        isVegetarian: values.isVegetarian,
        isBestseller: values.isBestseller,
        sortOrder: Number(values.sortOrder || 0),
        isActive: values.isActive,
        outletBusinessIds: values.outletBusinessIds,
        customPrice: values.customPrice ? Number(values.customPrice) : null,
      };

      await updateMutation.mutateAsync({
        productId: editingProduct.id,
        payload,
      });
      message.success(`Updated "${values.name}" successfully!`);
      setEditingProduct(null);
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update product.'),
      );
    }
  };

  const handleDelete = async (product: MasterMenuItemRecord) => {
    try {
      const res = await deleteMutation.mutateAsync(product.id);
      message.success(
        res.deleted
          ? `Product "${product.name}" deleted.`
          : `Product "${product.name}" deactivated (historical orders preserved).`,
      );
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to delete product.'),
      );
    }
  };

  const outletSelectOptions = useMemo(() => {
    const list = [
      { label: '🌟 All Outlets (Default Available Everywhere)', value: 'ALL' },
    ];
    if (outletsQuery.data) {
      for (const o of outletsQuery.data) {
        list.push({
          label: `📍 ${o.name} (${o.businessId})`,
          value: o.businessId,
        });
      }
    }
    return list;
  }, [outletsQuery.data]);

  const categoryOptions = useMemo(() => {
    return (categoriesQuery.data ?? []).map((c) => ({
      label: c.name,
      value: c.slug,
    }));
  }, [categoriesQuery.data]);

  const columns: ColumnsType<MasterMenuItemRecord> = [
    {
      title: 'Photo',
      key: 'image',
      width: 70,
      render: (_, record) =>
        record.imageUrl ? (
          <Image
            src={record.imageUrl}
            alt={record.name}
            width={48}
            height={48}
            className="rounded-lg object-cover"
            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><rect width='48' height='48' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='8'>Tea</text></svg>"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-brand-border bg-brand-cream/60 text-brand-forest">
            <Coffee className="h-5 w-5 opacity-70" />
          </div>
        ),
    },
    {
      title: 'Product Name',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-brand-black flex items-center gap-1.5">
            {record.name}
            {record.isBestseller && (
              <Tag color="gold" className="text-[10px] leading-tight px-1 py-0 m-0">
                ★ Bestseller
              </Tag>
            )}
            {record.isVegetarian && (
              <span
                className="inline-block h-2 w-2 rounded-full bg-green-600"
                title="100% Vegetarian"
              />
            )}
          </div>
          <div className="text-xs text-brand-muted line-clamp-1">
            {record.description || record.slug}
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categorySlug',
      key: 'categorySlug',
      width: 140,
      render: (cat: string, record) => (
        <Tag color="orange" className="capitalize">
          {record.categoryName || cat.replace(/-/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Master Price',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (p: number) => (
        <span className="font-bold text-brand-forest tabular-nums">
          ₹{Number(p).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'Active' : 'Archived'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<Edit className="h-3.5 w-3.5" />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title={`Delete "${record.name}"?`}
            description="If historical orders contain this item, it will be safely deactivated."
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              danger
              size="small"
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            Menu Products &amp; Items
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Add new beverages and snacks, upload photos to S3, and select which
            outlets offer each item.
          </p>
        </div>
        <Button
          type="primary"
          icon={<Plus className="h-4 w-4" />}
          className="bg-brand-forest hover:bg-brand-forest/90 font-semibold h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
          onClick={handleOpenAdd}
        >
          Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border border-brand-border p-3 shadow-soft bg-brand-cream/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-brand-black">
              Category:
            </span>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              className="w-48"
              options={[
                { label: 'All Categories', value: 'ALL' },
                ...categoryOptions,
              ]}
            />
          </div>
          <div className="w-full sm:w-64">
            <Input
              prefix={<Search className="h-3.5 w-3.5 text-gray-400" />}
              placeholder="Search by product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </div>
        </div>
      </Card>

      {productsQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load products"
          description={extractApiErrorMessage(productsQuery.error)}
        />
      ) : null}

      <Card className="rounded-2xl border border-brand-border shadow-soft">
        <Table<MasterMenuItemRecord>
          rowKey="id"
          loading={productsQuery.isLoading}
          columns={columns}
          dataSource={productsQuery.data ?? []}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* =========================================================================
          ADD PRODUCT MODAL
         ========================================================================= */}
      <Modal
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-lg font-bold text-brand-forest">
            <Utensils className="h-5 w-5" />
            <span>Add New Menu Product</span>
          </div>
        }
        footer={null}
        width={640}
        destroyOnClose
      >
        <form
          onSubmit={addForm.handleSubmit(onAddSubmit)}
          className="space-y-4 pt-2"
        >
          {/* S3 Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1.5">
              Product Photo (Uploaded to S3)
            </label>
            <Controller
              control={addForm.control}
              name="imageUrl"
              render={({ field }) => (
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  aspectRatioLabel="Recommended: 1:1 square photo, max 10MB"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Product Name *
              </label>
              <Controller
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <Input {...field} placeholder="e.g. Cardamom Kadak Chai" />
                )}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Category *
              </label>
              <Controller
                control={addForm.control}
                name="categorySlug"
                render={({ field }) => (
                  <Select
                    {...field}
                    className="w-full"
                    options={categoryOptions}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Master Price (₹) *
              </label>
              <Controller
                control={addForm.control}
                name="price"
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={1}
                    max={10000}
                    step={1}
                    className="w-full"
                    placeholder="15.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                URL Slug (Optional)
              </label>
              <Controller
                control={addForm.control}
                name="slug"
                render={({ field }) => (
                  <Input {...field} placeholder="cardamom-kadak-chai" />
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1">
              Description
            </label>
            <Controller
              control={addForm.control}
              name="description"
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  value={field.value ?? ''}
                  rows={2}
                  placeholder="Freshly crushed elaichi infused with pure milk"
                />
              )}
            />
          </div>

          {/* Outlet Dropdown Selector */}
          <div className="p-3.5 rounded-xl border border-brand-border bg-brand-cream/60 space-y-3">
            <div className="text-xs font-bold text-brand-forest uppercase tracking-wider">
              Outlet Availability &amp; Assignment
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1">
                Select Available Outlets *
              </label>
              <Controller
                control={addForm.control}
                name="outletBusinessIds"
                render={({ field }) => (
                  <Select
                    mode="multiple"
                    className="w-full"
                    placeholder="Select available outlets..."
                    value={field.value}
                    onChange={field.onChange}
                    options={outletSelectOptions}
                  />
                )}
              />
              <div className="text-[11px] text-brand-muted mt-1">
                Choose “All Outlets” or pick specific branch standees where this
                item can be ordered.
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-black mb-1">
                Custom Outlet Price Override (Optional)
              </label>
              <Controller
                control={addForm.control}
                name="customPrice"
                render={({ field }) => (
                  <InputNumber
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    min={1}
                    max={10000}
                    className="w-full"
                    placeholder="Leave empty to use master price"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
              <span className="text-xs font-semibold">Vegetarian</span>
              <Controller
                control={addForm.control}
                name="isVegetarian"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    size="small"
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
              <span className="text-xs font-semibold">Bestseller</span>
              <Controller
                control={addForm.control}
                name="isBestseller"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    size="small"
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
              <span className="text-xs font-semibold">Active</span>
              <Controller
                control={addForm.control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    size="small"
                  />
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-brand-border">
            <Button onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || addForm.formState.isSubmitting}
              disabled={createMutation.isPending || addForm.formState.isSubmitting}
              className="bg-brand-forest hover:bg-brand-forest/90"
            >
              Add Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          EDIT PRODUCT MODAL
         ========================================================================= */}
      <Modal
        open={Boolean(editingProduct)}
        onCancel={() => setEditingProduct(null)}
        title={
          <div className="flex items-center gap-2 text-lg font-bold text-brand-forest">
            <Edit className="h-5 w-5" />
            <span>Edit Product: {editingProduct?.name}</span>
          </div>
        }
        footer={null}
        width={640}
        destroyOnClose
      >
        <form
          onSubmit={editForm.handleSubmit(onEditSubmit)}
          className="space-y-4 pt-2"
        >
          {/* S3 Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1.5">
              Product Photo (Uploaded to S3)
            </label>
            <Controller
              control={editForm.control}
              name="imageUrl"
              render={({ field }) => (
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  aspectRatioLabel="Recommended: 1:1 square photo, max 10MB"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Product Name *
              </label>
              <Controller
                control={editForm.control}
                name="name"
                render={({ field }) => <Input {...field} />}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Category *
              </label>
              <Controller
                control={editForm.control}
                name="categorySlug"
                render={({ field }) => (
                  <Select
                    {...field}
                    className="w-full"
                    options={categoryOptions}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Master Price (₹) *
              </label>
              <Controller
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={1}
                    max={10000}
                    step={1}
                    className="w-full"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-black mb-1">
                Slug
              </label>
              <Controller
                control={editForm.control}
                name="slug"
                render={({ field }) => <Input {...field} />}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-black mb-1">
              Description
            </label>
            <Controller
              control={editForm.control}
              name="description"
              render={({ field }) => (
                <Input.TextArea {...field} value={field.value ?? ''} rows={2} />
              )}
            />
          </div>

          {/* Outlet Dropdown Selector */}
          <div className="p-3.5 rounded-xl border border-brand-border bg-brand-cream/60 space-y-3">
            <div className="text-xs font-bold text-brand-forest uppercase tracking-wider">
              Outlet Availability &amp; Assignment
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1">
                Select Available Outlets
              </label>
              <Controller
                control={editForm.control}
                name="outletBusinessIds"
                render={({ field }) => (
                  <Select
                    mode="multiple"
                    className="w-full"
                    placeholder="Select available outlets..."
                    value={field.value}
                    onChange={field.onChange}
                    options={outletSelectOptions}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
              <span className="text-xs font-semibold">Vegetarian</span>
              <Controller
                control={editForm.control}
                name="isVegetarian"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    size="small"
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
              <span className="text-xs font-semibold">Bestseller</span>
              <Controller
                control={editForm.control}
                name="isBestseller"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    size="small"
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between border border-brand-border rounded-lg p-2 bg-white">
              <span className="text-xs font-semibold">Active</span>
              <Controller
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    size="small"
                  />
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-brand-border">
            <Button onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateMutation.isPending}
              className="bg-brand-forest hover:bg-brand-forest/90"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
