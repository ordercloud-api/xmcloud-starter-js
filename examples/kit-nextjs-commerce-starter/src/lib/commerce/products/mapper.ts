import type {
  CommerceProduct,
  CommerceProductImage,
  OrderCloudBuyerProduct,
} from "./types";
import { asFiniteNumber, asNonEmptyString, asRecord } from "../normalization";

const toProductImage = (value: unknown): CommerceProductImage | undefined => {
  const stringUrl = asNonEmptyString(value);
  if (stringUrl) return { url: stringUrl };

  const image = asRecord(value);
  const url =
    asNonEmptyString(image?.url) ??
    asNonEmptyString(image?.Url) ??
    asNonEmptyString(image?.imageUrl) ??
    asNonEmptyString(image?.ImageUrl);
  if (!url) return undefined;

  return {
    url,
    alt:
      asNonEmptyString(image?.alt) ??
      asNonEmptyString(image?.Alt) ??
      asNonEmptyString(image?.altText) ??
      asNonEmptyString(image?.AltText),
  };
};

const getImages = (
  product: OrderCloudBuyerProduct,
  xp: Record<string, unknown> | undefined,
): CommerceProductImage[] => {
  const primaryImage =
    toProductImage(product.ImageUrl) ??
    toProductImage(xp?.imageUrl ?? xp?.ImageUrl);
  const galleryValue = xp?.images ?? xp?.Images;
  const galleryImages = Array.isArray(galleryValue)
    ? galleryValue.flatMap((value) => {
        const image = toProductImage(value);
        return image ? [image] : [];
      })
    : [];
  const images = primaryImage
    ? [primaryImage, ...galleryImages]
    : galleryImages;

  return images.filter(
    (image, index) =>
      images.findIndex((candidate) => candidate.url === image.url) === index,
  );
};

const getPrice = (value: unknown): { price?: number; currency?: string } => {
  const priceSchedule = asRecord(value);
  const priceBreaks = Array.isArray(priceSchedule?.PriceBreaks)
    ? priceSchedule.PriceBreaks
    : [];
  const firstPriceBreak = asRecord(priceBreaks[0]);

  return {
    price: asFiniteNumber(firstPriceBreak?.Price, { allowNumericString: true }),
    currency: asNonEmptyString(priceSchedule?.Currency),
  };
};

export const toCommerceProduct = (
  value: unknown,
): CommerceProduct | undefined => {
  const product = value as OrderCloudBuyerProduct;
  const id = asNonEmptyString(product?.ID);
  const name = asNonEmptyString(product?.Name);
  if (!id || !name) return undefined;

  const xp = asRecord(product.xp);
  const price = getPrice(product.PriceSchedule ?? product.DefaultPriceSchedule);
  const images = getImages(product, xp);

  return {
    id,
    name,
    description: asNonEmptyString(product.Description),
    imageUrl: images[0]?.url,
    images,
    brand: asNonEmptyString(xp?.brand),
    category: asNonEmptyString(xp?.category),
    price:
      price.price ?? asFiniteNumber(xp?.price, { allowNumericString: true }),
    currency: price.currency,
  };
};
