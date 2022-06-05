const { Writable } = require('stream')
const BusBoy = require('busboy')
const url = require('url')
const LocalStorageService = require('../services/local-storage-service')
const GoogleCloudStorageService = require('../services/google-cloud-storage-service')
const S3CloudStorageService = require('../services/s3-storage-service')
const { logger, pipelineAsync } = require('../util')

const localStorageService = new LocalStorageService()
const storageService = new GoogleCloudStorageService()
const s3storageService = new S3CloudStorageService()

const ON_UPLOAD_EVENT = 'file-uploaded'
const STORAGE_SERVICE = process.env.STORAGE_SERVICE || 'local'

class UploadHandler {
  #io
  #socketId
  constructor(io) {
    this.#io = io
  }

  async handle(request, response) {
    const { headers } = request
    const {
      query: { socketId },
    } = url.parse(request.url, true)
    this.#socketId = socketId

    const onFinish = (response) => () => {
      response.writeHead(201, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
      })
      response.end()
    }

    const busboyInstance = this.registerEvents(headers, onFinish(response))

    await pipelineAsync(request, busboyInstance)

    logger.info('Request finished with success!')
  }

  registerEvents(headers, onFinish) {
    const busboy = BusBoy({ headers });

    busboy.on('file', this.#onFile.bind(this))

    busboy.on('finish', onFinish)

    return busboy
  }

  #handleFileBytes() {
    async function* handleData(data) {
      for await (const item of data) {
        const size = item.length
        this.#io.to(this.#socketId).emit(ON_UPLOAD_EVENT, size)
        yield item
      }
    }
    return handleData.bind(this)
  }

  async #pipeStreamsToLocalStorage(file, fileName) {
    await pipelineAsync(
      file,
      this.#handleFileBytes.call(this),
      localStorageService.createWritableStreamToLocal(fileName),
    )
  }

  async #pipeStreamsToGoogleCloudStorage(file, fileName) {
    await pipelineAsync(
      file,
      this.#handleFileBytes.call(this),
      storageService.createWritableStreamToGCS(fileName),
    )
  }

  async #pipeStreamsToAWSS3Storage(file, fileName) {
    const waitFileUpload = s3storageService.uploadFile(file, fileName)
    await Promise.all([
      pipelineAsync(
        file,
        this.#handleFileBytes.call(this),
        new Writable({
          write(chunk, encoding, done) {
            done()
          },
          final(done) {
            done()
          },
        }),
      ),
      waitFileUpload,
    ])
  }

  async #pipeStreamToStorage(file, fileName) {
    const storageService = {
      local: this.#pipeStreamsToLocalStorage,
      gcs: this.#pipeStreamsToGoogleCloudStorage,
      s3: this.#pipeStreamsToAWSS3Storage,
    }

    await storageService[STORAGE_SERVICE].apply(this, [file, fileName])
  }

  async #onFile(name, file, info) {
    const { filename } = info;
    await this.#pipeStreamToStorage(file, filename)

    logger.info(`File [${filename}] finished!`)
  }
}

module.exports = UploadHandler
