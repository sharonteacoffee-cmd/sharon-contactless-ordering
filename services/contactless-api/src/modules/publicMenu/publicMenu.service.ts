import { AppError } from '../../utils/appError';
import { toPublicOutletDto } from '../publicOutlet/publicOutlet.dto';
import { findOutletBySlug } from '../publicOutlet/publicOutlet.repository';
import {
  toModifierGroupDtos,
  toPublicMenuCategoryDto,
  toPublicMenuItemDto,
  type PublicMenuResponseDto,
} from './publicMenu.dto';
import {
  findActiveMenuCategories,
  findAllModifierGroups,
  findAllModifierOptions,
  findMenuItemsByOutletId,
} from './publicMenu.repository';

export async function getPublicMenuByOutletSlug(
  outletSlug: string,
): Promise<PublicMenuResponseDto> {
  const outlet = await findOutletBySlug(outletSlug);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }

  const [categoryRows, itemRows, groupRows, optionRows] = await Promise.all([
    findActiveMenuCategories(),
    findMenuItemsByOutletId(outlet.id),
    findAllModifierGroups(),
    findAllModifierOptions(),
  ]);

  const items = itemRows.map(toPublicMenuItemDto);
  const addOnItems = items.filter(
    (item) => item.isAvailable && item.categorySlug === 'add-ons-customisations',
  );
  const upsellItems = (
    addOnItems.length > 0
      ? addOnItems
      : items.filter((item) => item.isAvailable && item.isBestseller)
  ).slice(0, 6);

  return {
    outlet: toPublicOutletDto(outlet),
    categories: categoryRows.map(toPublicMenuCategoryDto),
    items,
    upsellItems,
    modifierGroups: toModifierGroupDtos(groupRows, optionRows),
  };
}
