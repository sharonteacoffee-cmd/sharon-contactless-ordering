import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Sparkles, X } from 'lucide-react';
import type { ModifierGroup, PublicMenuItem, SelectedModifier } from '@sharon/shared';
import { formatINR } from '@/utils/currency';

interface ItemModifierModalProps {
  item: PublicMenuItem | null;
  modifierGroups: ModifierGroup[];
  onClose: () => void;
  onConfirmAdd: (params: {
    item: PublicMenuItem;
    quantity: number;
    selectedModifiers: SelectedModifier[];
    itemNote: string;
  }) => void;
}

export function ItemModifierModal({
  item,
  modifierGroups,
  onClose,
  onConfirmAdd,
}: ItemModifierModalProps) {
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [itemNote, setItemNote] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const sortedGroups = useMemo(
    () => [...modifierGroups].sort((a, b) => a.sortOrder - b.sortOrder),
    [modifierGroups],
  );

  useEffect(() => {
    if (!item) {
      return;
    }
    const defaults: Record<string, string[]> = {};
    for (const group of sortedGroups) {
      const sortedOptions = [...group.options].sort((a, b) => a.sortOrder - b.sortOrder);
      const defaultOpts = sortedOptions.filter((opt) => opt.isDefault).map((opt) => opt.id);
      if (defaultOpts.length > 0) {
        defaults[group.id] =
          group.displayType === 'RADIO'
            ? [defaultOpts[0]]
            : defaultOpts.slice(0, group.maxSelection || defaultOpts.length);
      } else if (group.isRequired && sortedOptions.length > 0) {
        defaults[group.id] = [sortedOptions[0].id];
      } else {
        defaults[group.id] = [];
      }
    }
    setSelectedByGroup(defaults);
    setQuantity(1);
    setItemNote('');
    setValidationError(null);
  }, [item, sortedGroups]);

  const selectedModifiers = useMemo<SelectedModifier[]>(() => {
    const result: SelectedModifier[] = [];
    for (const group of sortedGroups) {
      const selectedIds = selectedByGroup[group.id] ?? [];
      for (const option of group.options) {
        if (selectedIds.includes(option.id)) {
          result.push({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            priceExtra: option.priceExtra,
          });
        }
      }
    }
    return result;
  }, [sortedGroups, selectedByGroup]);

  if (!item) {
    return null;
  }

  const modifiersExtra = selectedModifiers.reduce((acc, m) => acc + m.priceExtra, 0);
  const unitTotal = item.price + modifiersExtra;
  const lineTotal = unitTotal * quantity;

  const handleToggleOption = (group: ModifierGroup, optionId: string) => {
    setValidationError(null);
    setSelectedByGroup((prev) => {
      const current = prev[group.id] ?? [];
      if (group.displayType === 'RADIO') {
        return { ...prev, [group.id]: [optionId] };
      }

      if (current.includes(optionId)) {
        if (group.isRequired && current.length <= Math.max(1, group.minSelection)) {
          return prev;
        }
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }

      const maxSel = group.maxSelection > 0 ? group.maxSelection : group.options.length;
      if (current.length >= maxSel) {
        return { ...prev, [group.id]: [...current.slice(1), optionId] };
      }

      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const handleSubmit = () => {
    for (const group of sortedGroups) {
      const count = (selectedByGroup[group.id] ?? []).length;
      if (group.isRequired && count < Math.max(1, group.minSelection)) {
        setValidationError(`Please choose at least one option for ${group.name}.`);
        return;
      }
    }

    onConfirmAdd({
      item,
      quantity,
      selectedModifiers,
      itemNote,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modifier-modal-title"
    >
      <div className="w-full sm:max-w-lg glass-sheet sm:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-brand-grey" />
        </div>

        {/* Modal Header */}
        <div className="px-5 pt-3 pb-4 border-b border-brand-border flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {item.isVegetarian ? (
                <span className="w-4 h-4 rounded border border-brand-leaf flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-brand-leaf" />
                </span>
              ) : (
                <span className="w-4 h-4 rounded border border-brand-rust flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-brand-rust" />
                </span>
              )}
              <h2
                id="modifier-modal-title"
                className="font-display text-xl font-bold text-brand-black"
              >
                {item.name}
              </h2>
            </div>
            <p className="text-xs text-brand-muted mt-1">
              Base price {formatINR(item.price)} • Customize your brew just the way you like
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close customization drawer"
            className="w-9 h-9 rounded-full bg-white/85 border border-brand-border flex items-center justify-center text-brand-black hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modifier Groups */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {sortedGroups.map((group) => {
            const selectedIds = selectedByGroup[group.id] ?? [];
            const sortedOptions = [...group.options].sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <section key={group.id} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-brand-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-chai" />
                    <span>{group.name}</span>
                  </h3>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/85 border border-brand-border text-brand-muted">
                    {group.isRequired
                      ? 'Required'
                      : group.displayType === 'CHECKBOX'
                        ? `Up to ${group.maxSelection || sortedOptions.length}`
                        : 'Optional'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sortedOptions.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleToggleOption(group, option.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-brand-forest text-white border-brand-forest shadow-sm'
                            : 'bg-white/85 text-brand-black border-brand-border hover:border-brand-forest/50'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{option.name}</span>
                        {option.priceExtra > 0 ? (
                          <span
                            className={`tabular-price ${
                              isSelected ? 'text-brand-amber' : 'text-brand-chai'
                            }`}
                          >
                            +{formatINR(option.priceExtra)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Special Instructions */}
          <section className="space-y-2">
            <label
              htmlFor="item-special-notes"
              className="block text-sm font-semibold text-brand-black"
            >
              Special Brew Instructions (Optional)
            </label>
            <input
              id="item-special-notes"
              type="text"
              maxLength={120}
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="e.g., Extra hot, serve in paper cup"
              className="w-full px-4 py-2.5 rounded-2xl bg-white/90 border border-brand-border text-sm text-brand-black placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-forest/25 focus:border-brand-forest"
            />
          </section>

          {validationError ? (
            <p className="text-xs font-medium text-brand-rust bg-brand-rust/10 border border-brand-rust/25 px-3 py-2 rounded-xl">
              {validationError}
            </p>
          ) : null}
        </div>

        {/* Sticky Footer CTA */}
        <div className="px-5 py-4 bg-white/90 backdrop-blur-xl border-t border-brand-border flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-cream border border-brand-border px-2 py-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="w-8 h-8 rounded-full bg-white border border-brand-border/60 flex items-center justify-center text-brand-black hover:bg-brand-cream"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-bold text-brand-black tabular-price">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              aria-label="Increase quantity"
              className="w-8 h-8 rounded-full bg-white border border-brand-border/60 flex items-center justify-center text-brand-black hover:bg-brand-cream"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="btn-forest-primary flex-1 py-3 px-5 rounded-full font-semibold text-sm active:scale-[0.99] flex items-center justify-center gap-2 tabular-price"
          >
            <span>Add to Tray</span>
            <span>•</span>
            <span>{formatINR(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
