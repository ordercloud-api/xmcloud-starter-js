"use client";

import { useId } from "react";
import {
  productSpecOptionControls,
  resolveDateConstraint,
  type CommerceProductSpec,
  type CommerceProductSpecOption,
  type ProductSpecOptionControl,
  type ProductSpecSelection,
  type ProductSpecSelections,
} from "@/lib/commerce/products/specs";

const selectedClasses = "border-slate-950 bg-slate-950 text-white";
const unselectedClasses =
  "border-slate-300 bg-white text-slate-900 hover:border-slate-500";

export const resolveDefaultOptionControl = (
  value: unknown,
): "dropdown" | "buttons" =>
  typeof value === "string" && value.toLowerCase() === "buttons"
    ? "buttons"
    : "dropdown";

const formatMarkup = (
  option: CommerceProductSpecOption,
  currency?: string,
): string | undefined => {
  const markup = option.priceMarkup;
  if (!markup || option.priceMarkupType === "NoMarkup") return undefined;
  if (option.priceMarkupType === "Percentage")
    return `${markup > 0 ? "+" : ""}${markup}%`;

  try {
    const amount = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      signDisplay: "always",
    }).format(markup);
    return option.priceMarkupType === "AmountPerQuantity"
      ? `${amount} each`
      : amount;
  } catch {
    return `${markup > 0 ? "+" : ""}${markup}`;
  }
};

const OptionDetails = ({
  option,
  currency,
  visual,
}: {
  option: CommerceProductSpecOption;
  currency?: string;
  visual: ProductSpecOptionControl;
}) => {
  const label = option.presentation.label ?? option.name;
  const markup = formatMarkup(option, currency);
  const showImage =
    (visual === "images" || visual === "cards") && option.presentation.imageUrl;
  const showSwatch = visual === "swatches";

  return (
    <>
      {showImage && (
        <img
          src={option.presentation.imageUrl}
          alt=""
          className="mb-2 aspect-square w-full rounded object-cover"
        />
      )}
      {showSwatch && (
        <span
          className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-300 bg-slate-100"
          style={
            option.presentation.color
              ? { backgroundColor: option.presentation.color }
              : undefined
          }
          aria-hidden="true"
        >
          {option.presentation.imageUrl && (
            <img
              src={option.presentation.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </span>
      )}
      <span className={visual === "swatches" ? "text-sm" : undefined}>
        {label}
      </span>
      {option.presentation.badge && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
          {option.presentation.badge}
        </span>
      )}
      {(option.presentation.description || markup) && (
        <span className="block text-xs opacity-80">
          {option.presentation.description}
          {option.presentation.description && markup ? " · " : null}
          {markup}
        </span>
      )}
    </>
  );
};

const OptionChoices = ({
  spec,
  selection,
  control,
  controlId,
  describedBy,
  currency,
  disabled,
  onChange,
}: {
  spec: CommerceProductSpec;
  selection: ProductSpecSelection;
  control: ProductSpecOptionControl;
  controlId: string;
  describedBy?: string;
  currency?: string;
  disabled: boolean;
  onChange: (selection: ProductSpecSelection) => void;
}) => {
  const selectOption = (optionId?: string) => {
    const option = spec.options.find((item) => item.id === optionId);
    onChange({
      optionId,
      value: option?.isOpenText ? selection.value : undefined,
    });
  };

  if (control === "dropdown") {
    return (
      <select
        id={controlId}
        value={selection.optionId ?? ""}
        required={spec.required}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(event) =>
          selectOption(event.currentTarget.value || undefined)
        }
        className="w-full rounded border border-slate-300 bg-white px-3 py-2"
      >
        <option value="">
          {spec.required
            ? `Select ${spec.presentation.label ?? spec.name}`
            : "No selection"}
        </option>
        {spec.options.map((option) => {
          const markup = formatMarkup(option, currency);
          return (
            <option key={option.id} value={option.id}>
              {option.presentation.label ?? option.name}
              {markup ? ` (${markup})` : ""}
            </option>
          );
        })}
      </select>
    );
  }

  if (control === "radio") {
    return (
      <div className="space-y-2" aria-describedby={describedBy}>
        {!spec.required && (
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name={controlId}
              checked={!selection.optionId}
              disabled={disabled}
              onChange={() => selectOption()}
            />
            No selection
          </label>
        )}
        {spec.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-2 text-sm"
          >
            <input
              type="radio"
              name={controlId}
              value={option.id}
              checked={selection.optionId === option.id}
              disabled={disabled}
              onChange={() => selectOption(option.id)}
            />
            <span>
              <OptionDetails
                option={option}
                currency={currency}
                visual="radio"
              />
            </span>
          </label>
        ))}
      </div>
    );
  }

  const layoutClasses =
    control === "cards"
      ? "grid gap-3 sm:grid-cols-2"
      : control === "images"
        ? "grid grid-cols-2 gap-3 sm:grid-cols-4"
        : "flex flex-wrap gap-2";
  const optionClasses =
    control === "cards"
      ? "min-h-24 rounded-lg p-4 text-left"
      : control === "images"
        ? "rounded-lg p-2 text-left"
        : control === "swatches"
          ? "flex items-center gap-2 rounded-full px-3 py-2"
          : "rounded-full px-4 py-2 text-sm";

  return (
    <div className={layoutClasses} aria-describedby={describedBy}>
      {spec.options.map((option) => {
        const selected = selection.optionId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() =>
              selectOption(selected && !spec.required ? undefined : option.id)
            }
            className={`border transition disabled:cursor-not-allowed disabled:opacity-50 ${optionClasses} ${selected ? selectedClasses : unselectedClasses}`}
          >
            <OptionDetails
              option={option}
              currency={currency}
              visual={control}
            />
          </button>
        );
      })}
    </div>
  );
};

const OpenTextControl = ({
  spec,
  selection,
  controlId,
  describedBy,
  disabled,
  onChange,
}: {
  spec: CommerceProductSpec;
  selection: ProductSpecSelection;
  controlId: string;
  describedBy?: string;
  disabled: boolean;
  onChange: (selection: ProductSpecSelection) => void;
}) => {
  const control = spec.presentation.textControl ?? "text";
  const commonProps = {
    id: controlId,
    value: selection.value ?? "",
    required: spec.required || Boolean(selection.optionId),
    disabled,
    placeholder: spec.presentation.placeholder,
    "aria-describedby": describedBy,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange({ ...selection, value: event.currentTarget.value }),
  };
  const input =
    control === "textarea" ? (
      <textarea {...commonProps} rows={4} className="w-full px-3 py-2" />
    ) : (
      <input
        {...commonProps}
        type={control}
        min={
          control === "date"
            ? resolveDateConstraint(spec.validation.minDate)
            : spec.validation.min
        }
        max={
          control === "date"
            ? resolveDateConstraint(spec.validation.maxDate)
            : spec.validation.max
        }
        step={control === "number" ? spec.validation.step : undefined}
        minLength={spec.validation.minLength}
        maxLength={spec.validation.maxLength}
        className="w-full px-3 py-2"
      />
    );

  return (
    <div className="flex items-stretch overflow-hidden rounded border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-slate-500">
      {spec.presentation.prefix && (
        <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
          {spec.presentation.prefix}
        </span>
      )}
      {input}
      {spec.presentation.suffix && (
        <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
          {spec.presentation.suffix}
        </span>
      )}
    </div>
  );
};

export const ProductSpecFields = ({
  specs,
  selections,
  errors,
  defaultOptionControl,
  currency,
  disabled,
  onChange,
}: {
  specs: CommerceProductSpec[];
  selections: ProductSpecSelections;
  errors: Record<string, string>;
  defaultOptionControl: "dropdown" | "buttons";
  currency?: string;
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
    const helpId = `${controlId}-help`;
    const describedBy =
      [
        spec.presentation.helpText ? helpId : undefined,
        errors[spec.id] ? errorId : undefined,
      ]
        .filter(Boolean)
        .join(" ") || undefined;
    const configuredControl = spec.presentation.control;
    const optionControl = productSpecOptionControls.includes(
      configuredControl as ProductSpecOptionControl,
    )
      ? configuredControl!
      : defaultOptionControl;
    const label = spec.presentation.label ?? spec.name;

    return (
      <fieldset key={spec.id} className="space-y-2">
        <legend className="text-sm font-medium">
          {label}
          {spec.required && <span aria-hidden="true"> *</span>}
        </legend>

        {spec.presentation.helpText && (
          <p id={helpId} className="text-sm text-slate-600">
            {spec.presentation.helpText}
          </p>
        )}

        {spec.options.length > 0 && (
          <OptionChoices
            spec={spec}
            selection={selection}
            control={optionControl}
            controlId={controlId}
            describedBy={describedBy}
            currency={currency}
            disabled={disabled}
            onChange={(nextSelection) => onChange(spec.id, nextSelection)}
          />
        )}

        {showOpenText && (
          <OpenTextControl
            spec={spec}
            selection={selection}
            controlId={
              spec.options.length === 0 ? controlId : `${controlId}-value`
            }
            describedBy={describedBy}
            disabled={disabled}
            onChange={(nextSelection) => onChange(spec.id, nextSelection)}
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
