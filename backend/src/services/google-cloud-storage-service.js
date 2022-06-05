const { Storage } = require("@google-cloud/storage");
const mime = require("mime-types");
const { logger } = require("../util");

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GCS_KEY_FILE_NAME,
});

const bucketName = process.env.GCS_BUCKET;
const destinationFolderName = process.env.GCS_ATTACHMENTS_FOLDER;

module.exports = class GoogleCloudStorageService {
  createWritableStreamToGCS(fileName) {
    logger.info('uploading to Google Cloud Storage')
    const contentType = mime.lookup(fileName);
    const destination = `${destinationFolderName}/${fileName}`;

    const bucket = storage.bucket(bucketName);
    return bucket.file(destination).createWriteStream({
      metadata: {
        contentType,
      },
    });
  }
};
