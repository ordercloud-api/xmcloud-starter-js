import Link from 'next/link';
import type { CommerceCartItem } from '@/lib/commerce/cart/types';
import {
  formatMoney,
  lineTotal,
  toCartItemSpecLabels,
} from '@/lib/commerce/cart/format';

type CartLineRowProps = {
  item: CommerceCartItem;
  currency?: string;
  compact?: boolean;
  href?: string;
  busy?: boolean;
  onChangeQuantity: (lineItemId: string, quantity: number) => void;
  onRemove: (lineItemId: string) => void;
};

const CartLineRow = ({
  item,
  currency,
  compact = false,
  href,
  busy = false,
  onChangeQuantity,
  onRemove,
}: CartLineRowProps) => {
  const imageUrl = item.thumbnailUrl ?? item.imageUrl;
  const specLabels = toCartItemSpecLabels(item.specs);
  const thumbClass = compact
    ? 'h-14 w-14 shrink-0 overflow-hidden rounded bg-slate-100'
    : 'h-20 w-20 shrink-0 overflow-hidden rounded bg-slate-100 sm:h-24 sm:w-24';

  const thumbnail = imageUrl ? (
    <div className={thumbClass}>
      <img
        src={imageUrl}
        alt={item.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  ) : null;

  const details = (
    <div className="min-w-0 space-y-1">
      {href ? (
        <Link href={href} className="font-medium hover:underline">
          {item.name}
        </Link>
      ) : (
        <p className="font-medium">{item.name}</p>
      )}
      {specLabels.length > 0 && (
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          {specLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}
      {!compact && (
        <p className="text-muted-foreground text-xs">
          {formatMoney(item.unitPrice, currency)} each
        </p>
      )}
    </div>
  );

  return (
    <li
      className={`flex gap-3 ${
        compact
          ? 'items-start py-3'
          : 'flex-col px-4 py-4 sm:flex-row sm:items-center sm:justify-between'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {href && thumbnail ? (
          <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden="true">
            {thumbnail}
          </Link>
        ) : (
          thumbnail
        )}
        {details}
      </div>
      <div
        className={`flex shrink-0 items-center gap-3 ${
          compact ? '' : 'justify-between sm:justify-end sm:gap-4'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Decrease quantity of ${item.name}`}
            onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
            disabled={busy || item.quantity <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-lg leading-none disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity of ${item.name}`}
            onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
            disabled={busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-lg leading-none disabled:opacity-40"
          >
            +
          </button>
        </div>
        <p className="min-w-16 text-right text-sm font-medium">
          {formatMoney(lineTotal(item.quantity, item.unitPrice), currency)}
        </p>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={busy}
          className="text-muted-foreground text-xs font-semibold underline disabled:opacity-40"
        >
          {busy ? 'Updating…' : 'Remove'}
        </button>
      </div>
    </li>
  );
};

export default CartLineRow;
