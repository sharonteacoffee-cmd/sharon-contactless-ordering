import type {
  ModifierGroup,
  ModifierOption,
  OutletPublicInfo,
  PublicMenuCategory,
  PublicMenuItem,
} from '@sharon/shared';

export interface MenuCategoryDbRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface OutletMenuItemDbRow {
  id: string;
  category_slug: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: string;
  custom_price: string | null;
  image_url: string | null;
  is_vegetarian: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface ModifierGroupDbRow {
  id: string;
  name: string;
  display_type: 'RADIO' | 'CHECKBOX';
  is_required: boolean;
  min_selection: number;
  max_selection: number;
  sort_order: number;
}

export interface ModifierOptionDbRow {
  id: string;
  group_id: string;
  name: string;
  price_extra: string;
  is_default: boolean;
  sort_order: number;
}

export interface PublicMenuResponseDto {
  outlet: OutletPublicInfo;
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
  upsellItems: PublicMenuItem[];
  modifierGroups: ModifierGroup[];
}

export function toPublicMenuCategoryDto(row: MenuCategoryDbRow): PublicMenuCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
  };
}

export function toPublicMenuItemDto(row: OutletMenuItemDbRow): PublicMenuItem {
  const effectivePrice =
    row.custom_price !== null ? Number(row.custom_price) : Number(row.base_price);

  return {
    id: row.id,
    categorySlug: row.category_slug,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(effectivePrice.toFixed(2)),
    imageUrl: row.image_url,
    isVegetarian: row.is_vegetarian,
    isBestseller: row.is_bestseller,
    isAvailable: row.is_available,
    sortOrder: row.sort_order,
  };
}

export function toModifierOptionDto(row: ModifierOptionDbRow): ModifierOption {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    priceExtra: Number(Number(row.price_extra).toFixed(2)),
    isDefault: row.is_default,
    sortOrder: row.sort_order,
  };
}

export function toModifierGroupDtos(
  groups: ModifierGroupDbRow[],
  options: ModifierOptionDbRow[],
): ModifierGroup[] {
  const optionsByGroup = new Map<string, ModifierOption[]>();
  for (const optRow of options) {
    const list = optionsByGroup.get(optRow.group_id) ?? [];
    list.push(toModifierOptionDto(optRow));
    optionsByGroup.set(optRow.group_id, list);
  }

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    displayType: group.display_type,
    isRequired: group.is_required,
    minSelection: group.min_selection,
    maxSelection: group.max_selection,
    sortOrder: group.sort_order,
    options: optionsByGroup.get(group.id) ?? [],
  }));
}
