import type {
  CommerceProduct,
  OrderCloudBuyerProduct,
} from "./types";
import { asFiniteNumber, asNonEmptyString, asRecord } from "../normalization";
import { getProductImages, toProductHeroImage } from "./images";

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
  const images = getProductImages(xp);

  return {
    id,
    name,
    description: asNonEmptyString(product.Description),
    ...toProductHeroImage(images),
    images,
    brand: asNonEmptyString(xp?.Brand),
    category: asNonEmptyString(xp?.Category),
    price:
      price.price ?? asFiniteNumber(xp?.Price, { allowNumericString: true }),
    currency: price.currency,
  };
};
