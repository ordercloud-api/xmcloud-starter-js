import type {
  CommerceProduct,
  CommerceProductImage,
  OrderCloudBuyerProduct,
} from "./types";
import { asFiniteNumber, asNonEmptyString, asRecord } from "../normalization";

type MappedProductImage = CommerceProductImage & { primary: boolean };

const toProductImage = (value: unknown): MappedProductImage | undefined => {
  const image = asRecord(value);
  const url = asNonEmptyString(image?.Url);
  if (!url) return undefined;

  return {
    url,
    thumbnailUrl: asNonEmptyString(image?.Thumbnailurl),
    primary: image?.Primary === true,
  };
};

const getImages = (
  xp: Record<string, unknown> | undefined,
): CommerceProductImage[] => {
  const images = Array.isArray(xp?.Images)
    ? xp.Images.flatMap((value) => {
        const image = toProductImage(value);
        return image ? [image] : [];
      })
    : [];
  const uniqueImages = images.filter(
    (image, index) =>
      images.findIndex((candidate) => candidate.url === image.url) === index,
  );
  const primaryIndex = uniqueImages.findIndex((image) => image.primary);
  const orderedImages =
    primaryIndex > 0
      ? [
          uniqueImages[primaryIndex],
          ...uniqueImages.filter((_, index) => index !== primaryIndex),
        ]
      : uniqueImages;

  return orderedImages.map(({ primary: _primary, ...image }) => image);
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
  const images = getImages(xp);

  return {
    id,
    name,
    description: asNonEmptyString(product.Description),
    imageUrl: images[0]?.url,
    thumbnailUrl: images[0]?.thumbnailUrl ?? images[0]?.url,
    images,
    brand: asNonEmptyString(xp?.Brand),
    category: asNonEmptyString(xp?.Category),
    price:
      price.price ?? asFiniteNumber(xp?.Price, { allowNumericString: true }),
    currency: price.currency,
  };
};
