import { asNonEmptyString, asRecord } from "../normalization";
import type { CommerceProductImage } from "./types";

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

/**
 * Reads OrderCloud `xp.Images` (`Url`, optional `Thumbnailurl`, optional `Primary`)
 * and returns unique images with the primary entry first.
 */
export const getProductImages = (
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

export const toProductHeroImage = (
  images: CommerceProductImage[],
): { imageUrl?: string; thumbnailUrl?: string } => {
  const first = images[0];
  if (!first) return {};

  return {
    imageUrl: first.url,
    thumbnailUrl: first.thumbnailUrl ?? first.url,
  };
};
