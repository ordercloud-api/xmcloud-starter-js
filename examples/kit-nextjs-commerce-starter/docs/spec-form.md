# SpecForm presentation XP

`SpecForm` renders option-based OrderCloud specs as dropdowns by default. In SitecoreAI Pages, an editor can choose the **Buttons** component variant from the Design tab to make buttons the component-wide default. Open-text specs render as single-line text inputs by default.

The `DefaultOptionControl` rendering parameter remains supported for integrations that set rendering parameters directly, but SitecoreAI Pages does not expose arbitrary custom rendering-parameter fields in its standard Design panel.

OrderCloud Spec XP can override either default for an individual spec:

```json
{
  "presentation": {
    "control": "swatches",
    "textControl": "text",
    "label": "Finish",
    "helpText": "Choose a finish",
    "placeholder": "Enter a custom finish",
    "prefix": "$",
    "suffix": "each"
  },
  "validation": {
    "min": 1,
    "max": 100,
    "step": 1,
    "minLength": 2,
    "maxLength": 40,
    "minDate": "today",
    "maxDate": "2027-12-31"
  }
}
```

Supported `presentation.control` values are `dropdown`, `buttons`, `radio`, `swatches`, `images`, and `cards`. Supported `presentation.textControl` values are `text`, `textarea`, `number`, and `date`.

OrderCloud Spec Option XP controls how each option appears:

```json
{
  "presentation": {
    "label": "Midnight navy",
    "description": "Deep blue woven finish",
    "color": "#1e3a5f",
    "imageUrl": "https://example.com/finishes/navy.jpg",
    "badge": "Popular"
  }
}
```

Swatches can use `color` or `imageUrl`; image and card controls use `imageUrl`. Missing or unsupported XP falls back to the component default and the OrderCloud option name. Price adjustments continue to come from the option's `PriceMarkupType` and `PriceMarkup`, not XP.

Required selections and configured open-text constraints are validated in `ProductContainer`. `AddToCart` consumes that shared state and remains disabled until all required specs are valid.
