'use client';

import { useId } from 'react';
import type {
  CommerceProductSpec,
  ProductSpecSelection,
  ProductSpecSelections,
} from '@/lib/commerce/products/specs';

export const ProductSpecFields = ({
  specs,
  selections,
  errors,
  disabled,
  onChange,
}: {
  specs: CommerceProductSpec[];
  selections: ProductSpecSelections;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (specId: string, selection: ProductSpecSelection) => void;
}) => {
  const idPrefix = useId();

  return specs.map((spec, index) => {
    const selection = selections[spec.id] ?? {};
    const selectedOption = spec.options.find(
      (option) => option.id === selection.optionId,
    );
    const showOpenText =
      (spec.options.length === 0 && spec.allowOpenText) ||
      selectedOption?.isOpenText === true;
    const controlId = `${idPrefix}-${index}`;
    const errorId = `${controlId}-error`;

    return (
      <fieldset key={spec.id} className="space-y-2">
        <legend className="text-sm font-medium">
          {spec.name}
          {spec.required && <span aria-hidden="true"> *</span>}
        </legend>

        {spec.options.length > 0 && (
          <select
            id={controlId}
            value={selection.optionId ?? ''}
            required={spec.required}
            disabled={disabled}
            aria-describedby={errors[spec.id] ? errorId : undefined}
            onChange={(event) => {
              const optionId = event.currentTarget.value || undefined;
              const option = spec.options.find((item) => item.id === optionId);
              onChange(spec.id, {
                optionId,
                value: option?.isOpenText ? selection.value : undefined,
              });
            }}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">
              {spec.required ? `Select ${spec.name}` : 'No selection'}
            </option>
            {spec.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        )}

        {showOpenText && (
          <input
            id={spec.options.length === 0 ? controlId : `${controlId}-value`}
            type="text"
            value={selection.value ?? ''}
            required={spec.required || selectedOption?.isOpenText === true}
            disabled={disabled}
            aria-label={spec.name}
            aria-describedby={errors[spec.id] ? errorId : undefined}
            onChange={(event) =>
              onChange(spec.id, {
                ...selection,
                value: event.currentTarget.value,
              })
            }
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        )}

        {errors[spec.id] && (
          <p id={errorId} className="text-sm text-red-700" role="alert">
            {errors[spec.id]}
          </p>
        )}
      </fieldset>
    );
  });
};
