import { describe, expect, it } from 'vitest';
import {
  getInitialSpecSelections,
  toLineItemSpecs,
  validateSpecSelections,
  type CommerceProductSpec,
} from '../lib/commerce/products/specs';

const specs: CommerceProductSpec[] = [
  {
    id: 'SIZE',
    name: 'Size',
    required: true,
    allowOpenText: false,
    definesVariant: true,
    defaultOptionId: 'MEDIUM',
    options: [
      { id: 'SMALL', name: 'Small', isOpenText: false },
      { id: 'MEDIUM', name: 'Medium', isOpenText: false },
    ],
  },
  {
    id: 'ENGRAVING',
    name: 'Engraving',
    required: false,
    allowOpenText: true,
    definesVariant: false,
    defaultValue: 'Hello',
    options: [],
  },
];

describe('product spec selections', () => {
  it('initializes product assignment defaults', () => {
    expect(getInitialSpecSelections(specs)).toEqual({
      SIZE: { optionId: 'MEDIUM', value: undefined },
      ENGRAVING: { optionId: undefined, value: 'Hello' },
    });
  });

  it('validates required options and selected open-text options', () => {
    const openTextOptionSpecs: CommerceProductSpec[] = [
      {
        ...specs[0],
        options: [{ id: 'OTHER', name: 'Other', isOpenText: true }],
        defaultOptionId: undefined,
      },
    ];

    expect(validateSpecSelections(specs, {})).toEqual({ SIZE: 'Select Size.' });
    expect(
      validateSpecSelections(openTextOptionSpecs, {
        SIZE: { optionId: 'OTHER' },
      }),
    ).toEqual({ SIZE: 'Enter Size.' });
  });

  it('builds the selected OrderCloud line-item specs and omits blank optional values', () => {
    expect(
      toLineItemSpecs(specs, {
        SIZE: { optionId: 'SMALL' },
        ENGRAVING: { value: '  Codex  ' },
      }),
    ).toEqual([
      { SpecID: 'SIZE', OptionID: 'SMALL', Value: undefined },
      { SpecID: 'ENGRAVING', OptionID: undefined, Value: 'Codex' },
    ]);
    expect(
      toLineItemSpecs(specs, { SIZE: { optionId: 'SMALL' } }),
    ).toHaveLength(1);
  });
});
