import { describe, expect, it } from 'vitest';
import type {
  ModifierOptionJoinedRow,
  PricedMenuItemRow,
} from '../src/modules/publicOrder/publicOrder.repository';
import { calculateServerOrderLines } from '../src/modules/publicOrder/publicOrder.service';
import { AppError } from '../src/utils/appError';

describe('Server-Side Order Price Recalculation', () => {
  const teaId = '8f29e0a1-1234-4abc-9def-001122334455';
  const biscuitId = '8f29e0a1-1234-4abc-9def-001122334466';
  const soldOutId = '8f29e0a1-1234-4abc-9def-001122334477';
  const jaggeryOptId = '11111111-2222-3333-4444-555555555551';
  const gingerOptId = '11111111-2222-3333-4444-555555555552';

  const menuMap = new Map<string, PricedMenuItemRow>([
    [
      teaId,
      {
        id: teaId,
        name: 'Sharon Classic',
        base_price: '20.00',
        custom_price: '25.00', // outlet override price
        is_active: true,
        is_available: true,
      },
    ],
    [
      biscuitId,
      {
        id: biscuitId,
        name: 'Osmania Butter Biscuit',
        base_price: '10.00',
        custom_price: null,
        is_active: true,
        is_available: true,
      },
    ],
    [
      soldOutId,
      {
        id: soldOutId,
        name: 'Bun Maska',
        base_price: '35.00',
        custom_price: null,
        is_active: true,
        is_available: false,
      },
    ],
  ]);

  const modMap = new Map<string, ModifierOptionJoinedRow>([
    [
      jaggeryOptId,
      {
        option_id: jaggeryOptId,
        option_name: 'Organic Jaggery',
        price_extra: '5.00',
        group_id: 'aaaa1111-1111-4111-8111-111111111111',
        group_name: 'Sugar Level',
        max_selection: 1,
      },
    ],
    [
      gingerOptId,
      {
        option_id: gingerOptId,
        option_name: 'Extra Ginger',
        price_extra: '5.00',
        group_id: 'bbbb2222-2222-4222-8222-222222222222',
        group_name: 'Brew Strength',
        max_selection: 2,
      },
    ],
  ]);

  it('computes unit prices, outlet custom price overrides, and modifier extras strictly from DB', () => {
    const result = calculateServerOrderLines(
      [
        {
          menuItemId: teaId,
          quantity: 2,
          selectedModifierOptionIds: [jaggeryOptId, gingerOptId],
        },
        {
          menuItemId: biscuitId,
          quantity: 1,
          selectedModifierOptionIds: [],
        },
      ],
      menuMap,
      modMap,
    );

    // (25 + 5 + 5) * 2 = 70, plus 10 * 1 = 10 => 80
    expect(result.subtotal).toBe(80);
    expect(result.tax).toBe(0);
    expect(result.totalAmount).toBe(80);
    expect(result.lineItems[0].unitPrice).toBe(25);
    expect(result.lineItems[0].modifiersTotal).toBe(10);
    expect(result.lineItems[0].lineTotal).toBe(70);
  });

  it('rejects sold-out items with 409 Conflict', () => {
    expect(() =>
      calculateServerOrderLines(
        [{ menuItemId: soldOutId, quantity: 1, selectedModifierOptionIds: [] }],
        menuMap,
        modMap,
      ),
    ).toThrowError(AppError);

    try {
      calculateServerOrderLines(
        [{ menuItemId: soldOutId, quantity: 1, selectedModifierOptionIds: [] }],
        menuMap,
        modMap,
      );
    } catch (err) {
      expect((err as AppError).statusCode).toBe(409);
      expect((err as AppError).code).toBe('ITEM_OUT_OF_STOCK');
    }
  });
});
