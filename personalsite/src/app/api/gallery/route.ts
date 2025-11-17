import AWS from 'aws-sdk';
import { NextResponse } from 'next/server';

const albumBucket = 'kt-personalsite';
AWS.config.region = 'us-east-2'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'us-east-2:77a9939f-46ab-4cc3-b3cd-3dec20b8298d',
});

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
});

export async function GET() {
  const galleryPrefix = 'galleryimgs/'; // Folder prefix in the S3 bucket

  try {
    // List albums (folders) in the S3 bucket
    const albumData = await s3
      .listObjectsV2({
        Bucket: albumBucket,
        Delimiter: '/', // Delimiter to group by folders
        Prefix: galleryPrefix,
      })
      .promise();

    const galleryData: Record<string, string[]> = {};

    // Iterate over the folders (albums)
    const albums = albumData.CommonPrefixes || [];
    for (const album of albums) {
      const albumName = album.Prefix!.replace(galleryPrefix, '').replace('/', '');

      // List photos in the current album
      const photoData = await s3
        .listObjectsV2({
          Bucket: albumBucket,
          Prefix: album.Prefix,
        })
        .promise();

      const photos = photoData.Contents?.map((photo) => {
        const photoUrl = `https://${albumBucket}.s3.${AWS.config.region}.amazonaws.com/${photo.Key}`;
        return photoUrl;
      }) || [];

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
