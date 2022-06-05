const { Upload } = require('@aws-sdk/lib-storage')
const { S3 } = require('@aws-sdk/client-s3')
const { Writable } = require('stream')
const mime = require('mime-types')
const { v4 } = require('uuid')

const bucketName = process.env.S3_BUCKET
const s3Client = new S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_ACCESS_SECRET_KEY_ID,
  },
  region: process.env.AWS_REGION || 'us-east-1',
})

module.exports = class AWSS3StorageService {
  async uploadFile(readStream, fileName) {
    const contentType = mime.lookup(fileName)

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: fileName,
        Body: readStream,
        ContentType: contentType,
      },
    })

    await upload.done()
  }
}
