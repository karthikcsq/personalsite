import "server-only";

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";

const GALLERY_BUCKET = "kt-personalsite";
const GALLERY_REGION = "us-east-2";
const GALLERY_PREFIX = "galleryimgs/";
const GALLERY_CACHE_MS = 60 * 60 * 1000;

export type GalleryIndex = Record<string, string[]>;

export type GalleryCategorySummary = {
  name: string;
  photoCount: number;
};

const s3 = new S3Client({
  region: GALLERY_REGION,
  credentials: fromCognitoIdentityPool({
    clientConfig: { region: GALLERY_REGION },
    identityPoolId: "us-east-2:77a9939f-46ab-4cc3-b3cd-3dec20b8298d",
  }),
});

let cachedGallery:
  | { expiresAt: number; value: GalleryIndex }
  | undefined;
let inFlightGallery: Promise<GalleryIndex> | undefined;

async function fetchGalleryIndex(): Promise<GalleryIndex> {
  const albumData = await s3.send(
    new ListObjectsV2Command({
      Bucket: GALLERY_BUCKET,
      Delimiter: "/",
      Prefix: GALLERY_PREFIX,
    }),
  );

  const entries = await Promise.all(
    (albumData.CommonPrefixes ?? []).flatMap((album) => {
      if (!album.Prefix) return [];
      return [
        (async () => {
          const category = album.Prefix!.slice(GALLERY_PREFIX.length).replace(
            /\/$/,
            "",
          );
          const photoData = await s3.send(
            new ListObjectsV2Command({
              Bucket: GALLERY_BUCKET,
              Prefix: album.Prefix,
            }),
          );
          const photos = (photoData.Contents ?? [])
            .flatMap((photo) => {
              const key = photo.Key ?? "";
              if (
                !key ||
                key.endsWith("/") ||
                !/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(key)
              ) {
                return [];
              }
              return [
                `https://${GALLERY_BUCKET}.s3.${GALLERY_REGION}.amazonaws.com/${key}`,
              ];
            })
            .sort();
          return [category, photos] as const;
        })(),
      ];
    }),
  );

  return Object.fromEntries(
    entries
      .filter(([, photos]) => photos.length > 0)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export async function loadGalleryIndex(): Promise<GalleryIndex> {
  const now = Date.now();
  if (cachedGallery && cachedGallery.expiresAt > now) {
    return cachedGallery.value;
  }
  if (!inFlightGallery) {
    inFlightGallery = fetchGalleryIndex()
      .then((value) => {
        cachedGallery = {
          expiresAt: Date.now() + GALLERY_CACHE_MS,
          value,
        };
        return value;
      })
      .finally(() => {
        inFlightGallery = undefined;
      });
  }
  return inFlightGallery;
}

export async function loadGalleryCategoryDirectory(): Promise<
  GalleryCategorySummary[]
> {
  const index = await loadGalleryIndex();
  return Object.entries(index).map(([name, photos]) => ({
    name,
    photoCount: photos.length,
  }));
}

export function galleryCategoryPromptDirectory(
  categories: GalleryCategorySummary[],
): string {
  if (categories.length === 0) return "(none available)";
  return categories
    .map(
      ({ name, photoCount }) =>
        `- ${name}: ${photoCount} photos; assetId "gallery:${name}"`,
    )
    .join("\n");
}
