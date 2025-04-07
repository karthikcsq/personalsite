import AWS from 'aws-sdk';

const albumBucket = 'kt-personalsite';
AWS.config.region = 'us-east-2'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'us-east-2:77a9939f-46ab-4cc3-b3cd-3dec20b8298d',
});

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
});

export default async function handler(req, res) {
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

    const galleryData = {};

    // Iterate over the folders (albums)
    const albums = albumData.CommonPrefixes || [];
    for (const album of albums) {
      const albumName = album.Prefix.replace(galleryPrefix, '').replace('/', '');

      // List photos in the current album
      const photoData = await s3
        .listObjectsV2({
          Bucket: albumBucket,
          Prefix: album.Prefix,
        })
        .promise();

      const photos = photoData.Contents.map((photo) => {
        const photoUrl = `https://${albumBucket}.s3.${AWS.config.region}.amazonaws.com/${photo.Key}`;
        return photoUrl;
      });

      galleryData[albumName] = photos;
    }

    res.status(200).json(galleryData);
  } catch (error) {
    console.error('Error fetching gallery data from S3:', error);
    res.status(500).json({ error: 'Failed to fetch gallery data' });
  }
}