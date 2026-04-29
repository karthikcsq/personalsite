import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { NextResponse } from 'next/server';

const albumBucket = 'kt-personalsite';
const region = 'us-east-2';

const s3 = new S3Client({
  region,
  credentials: fromCognitoIdentityPool({
    clientConfig: { region },
    identityPoolId: 'us-east-2:77a9939f-46ab-4cc3-b3cd-3dec20b8298d',
  }),
});

export async function GET() {
  const galleryPrefix = 'galleryimgs/'; // Folder prefix in the S3 bucket

  try {
    // List albums (folders) in the S3 bucket
    const albumData = await s3.send(
      new ListObjectsV2Command({
        Bucket: albumBucket,
        Delimiter: '/',
        Prefix: galleryPrefix,
      }),
    );

    const galleryData: Record<string, string[]> = {};

    const albums = albumData.CommonPrefixes || [];
    for (const album of albums) {
      const albumName = album.Prefix!.replace(galleryPrefix, '').replace('/', '');

      const photoData = await s3.send(
        new ListObjectsV2Command({
          Bucket: albumBucket,
          Prefix: album.Prefix,
        }),
      );

      const photos =
        photoData.Contents?.filter((photo) => {
          const key = photo.Key || '';
          return !key.endsWith('/') && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(key);
        }).map((photo) => `https://${albumBucket}.s3.${region}.amazonaws.com/${photo.Key}`) || [];

      galleryData[albumName] = photos;
    }

    return NextResponse.json(galleryData, { status: 200 });
  } catch (error) {
    console.error('Error fetching gallery data from S3:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery data' },
      { status: 500 }
    );
  }
}
