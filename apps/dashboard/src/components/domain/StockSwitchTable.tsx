import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Coffee, Save, Search } from 'lucide-react';
import { formatISTDateTime } from '@sharon/shared';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { OutletStockItem } from '../../types/dashboard';

interface StockSwitchTableProps {
  items: OutletStockItem[];
  loading: boolean;
  mutatingItemId: string | null;
  onToggleAvailability: (
    item: OutletStockItem,
    isAvailable: boolean,
  ) => void;
  onSaveCustomPrice: (
    item: OutletStockItem,
    customPrice: number | null,
  ) => void;
}

export function StockSwitchTable({
  items,
  loading,
  mutatingItemId,
  onToggleAvailability,
  onSaveCustomPrice,
}: StockSwitchTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, number | null>>(
    {},
  );

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(items.map((item) => item.categorySlug)),
    ).sort();
    return unique;
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'ALL' && item.categorySlug !== categoryFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(term) ||
        item.categorySlug.toLowerCase().includes(term)
      );
    });
  }, [items, debouncedSearchTerm, categoryFilter]);

  const columns: ColumnsType<OutletStockItem> = [
    {
      title: 'Beverage / Item',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            shape="square"
            size={44}
            src={record.imageUrl ?? undefined}
            icon={<Coffee className="h-4 w-4" />}
            className="shrink-0 bg-brand-cream text-brand-forest"
          />
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-brand-black">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full border ${
                  record.isVegetarian !== false
                    ? 'border-brand-leaf bg-brand-leaf'
                    : 'border-brand-rust bg-brand-rust'
                }`}
              />
              <span>{record.name}</span>
              {record.isBestseller ? (
                <Tag
                  color="#FC9C34"
                  className="m-0 text-[10px] font-bold text-brand-black"
                >
                  Bestseller
                </Tag>
              ) : null}
            </div>
            <div className="text-xs capitalize text-brand-muted">
              {record.categorySlug.replace(/-/g, ' ')}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Master Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 120,
      render: (value: number) => (
        <span className="font-medium text-gray-600 tabular-nums">
          ₹{Number(value).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Custom Outlet Price (₹)',
      key: 'customPrice',
      width: 240,
      render: (_, record) => {
        const draftValue =
          record.menuItemId in priceDrafts
            ? priceDrafts[record.menuItemId]
            : record.customPrice;
        const isDirty =
          record.menuItemId in priceDrafts &&
          priceDrafts[record.menuItemId] !== record.customPrice;

        return (
          <Space.Compact>
            <InputNumber
              min={0}
              max={100000}
              precision={2}
              placeholder={`Master ₹${Number(record.basePrice).toFixed(0)}`}
              value={draftValue ?? undefined}
              onChange={(val) =>
                setPriceDrafts((prev) => ({
                  ...prev,
                  [record.menuItemId]:
                    val === null || val === undefined ? null : Number(val),
                }))
              }
              style={{ width: 135 }}
            />
            <Button
              type={isDirty ? 'primary' : 'default'}
              icon={<Save className="h-3.5 w-3.5" />}
              loading={mutatingItemId === record.menuItemId}
              onClick={() =>
                onSaveCustomPrice(record, draftValue ?? null)
              }
            >
              Save
            </Button>
          </Space.Compact>
        );
      },
    },
    {
      title: 'Effective Price',
      dataIndex: 'effectivePrice',
      key: 'effectivePrice',
      width: 130,
      render: (value: number, record) => (
        <span className="font-bold text-brand-forest tabular-nums">
          ₹{Number(value ?? record.customPrice ?? record.basePrice).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Availability',
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      width: 160,
      render: (isAvailable: boolean, record) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={isAvailable}
            loading={mutatingItemId === record.menuItemId}
            checkedChildren="In Stock"
            unCheckedChildren="Sold Out"
            onChange={(checked) => onToggleAvailability(record, checked)}
          />
        </div>
      ),
    },
    {
      title: 'Last Updated (IST)',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 195,
      render: (value: string) =>
        value ? (
          <span className="text-xs text-gray-500 tabular-nums">
            {formatISTDateTime(value)}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          allowClear
          placeholder="Search beverage name or category..."
          prefix={<Search className="h-4 w-4 text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 220 }}
          options={[
            { label: 'All Categories', value: 'ALL' },
            ...categories.map((slug) => ({
              label: slug.replace(/-/g, ' ').toUpperCase(),
              value: slug,
            })),
          ]}
        />
      </div>

      <Table<OutletStockItem>
        rowKey="menuItemId"
        loading={loading}
        columns={columns}
        dataSource={filteredItems}
        pagination={{ pageSize: 15, showSizeChanger: true }}
        scroll={{ x: 960 }}
      />
    </div>
  );
}
