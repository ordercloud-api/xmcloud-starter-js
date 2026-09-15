import { describe, expect, it } from 'vitest';
import {
  getInitialSpecSelections,
  toCommerceProductSpec,
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
    presentation: {},
    validation: {},
    options: [
      { id: 'SMALL', name: 'Small', isOpenText: false, presentation: {} },
      { id: 'MEDIUM', name: 'Medium', isOpenText: false, presentation: {} },
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
    presentation: {},
    validation: {},
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
        options: [
          {
            id: 'OTHER',
            name: 'Other',
            isOpenText: true,
            presentation: {},
          },
        ],
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

  it('normalizes supported Spec and Option XP presentation', () => {
    expect(
      toCommerceProductSpec({
        ID: 'COLOR',
        Name: 'Color',
        Required: true,
        xp: {
          presentation: {
            control: 'swatches',
            label: 'Finish',
            helpText: 'Choose a finish',
          },
        },
        Options: [
          {
            ID: 'NAVY',
            Value: 'Navy',
            PriceMarkupType: 'Percentage',
            PriceMarkup: 5,
            xp: {
              presentation: {
                label: 'Midnight navy',
                color: '#1e3a5f',
                imageUrl: 'https://example.com/navy.jpg',
                badge: 'Popular',
              },
            },
          },
        ],
      }),
    ).toMatchObject({
      presentation: {
        control: 'swatches',
        label: 'Finish',
        helpText: 'Choose a finish',
      },
      options: [
        {
          priceMarkupType: 'Percentage',
          priceMarkup: 5,
          presentation: {
            label: 'Midnight navy',
            color: '#1e3a5f',
            imageUrl: 'https://example.com/navy.jpg',
            badge: 'Popular',
          },
        },
      ],
    });
  });

  it('falls back safely when presentation XP is unsupported', () => {
    expect(
      toCommerceProductSpec({
        ID: 'COLOR',
        Name: 'Color',
        xp: { presentation: { control: 'carousel' } },
        Options: [
          {
            ID: 'RED',
            Value: 'Red',
            xp: {
              presentation: {
                color: 'url(javascript:bad)',
                imageUrl: 'javascript:bad',
              },
            },
          },
        ],
      }),
    ).toMatchObject({
      presentation: { control: undefined },
      options: [{ presentation: { color: undefined, imageUrl: undefined } }],
    });
  });

  it('validates configured open-text constraints', () => {
    const configured: CommerceProductSpec[] = [
      {
        ...specs[1],
        required: true,
        presentation: { label: 'Message', textControl: 'text' },
        validation: { minLength: 3, maxLength: 8 },
      },
    ];

    expect(validateSpecSelections(configured, { ENGRAVING: { value: 'Hi' } })).toEqual({
      ENGRAVING: 'Message must be at least 3 characters.',
    });
    expect(validateSpecSelections(configured, { ENGRAVING: { value: 'Welcome' } })).toEqual({});
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
    expect(toLineItemSpecs(specs, { SIZE: { optionId: 'SMALL' } })).toHaveLength(1);
  });
});
