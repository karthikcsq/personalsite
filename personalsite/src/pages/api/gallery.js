import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const galleryPath = path.join(process.cwd(), 'public', 'galleryimgs');
  const folders = fs.readdirSync(galleryPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const galleryData = {};

  folders.forEach((folder) => {
    const folderPath = path.join(galleryPath, folder);
    const images = fs.readdirSync(folderPath)
      .filter((fileName) => /\.(jpg|jpeg|png|gif|svg)$/i.test(fileName)) // Filter image files
      .map((fileName) => `/galleryimgs/${folder}/${fileName}`);
    galleryData[folder] = images;
  });

  res.status(200).json(galleryData);
}