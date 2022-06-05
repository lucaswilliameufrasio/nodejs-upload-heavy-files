const { Writable } = require('stream')
const BusBoy = require('busboy')
const { v4 } = require('uuid')
const url = require('url')
const { default: PQueue } = require('p-queue')
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
    const queue = new PQueue({ concurrency: 1 })
    const { headers } = request
    const {
      query: { socketId },
    } = url.parse(request.url, true)
    this.#socketId = socketId

    const abort = this.#abortOnError(queue, request, response)
    const busboyInstance = this.registerEvents(
      headers,
      this.#handleError(queue, request, response),
      abort,
    )

    // TODO: find a way to access the list of files uploaded
    // to delete all them when required to do an atomic operation
    request.on('abort', () => abort(busboyInstance))

    await pipelineAsync(request, busboyInstance)

    await queue.onIdle()

    logger.info('Request finished with success!')
    response.writeHead(201, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST',
    })
    response.end()
  }

  registerEvents(headers, handleError, abortOnError) {
    const busboy = BusBoy({ headers })

    busboy.on('file', (name, file, info) => {
      handleError(busboy, async () => {
        return this.#onFile(name, file, info)
      })
    })

    busboy.on('error', () => {
      abortOnError(busboy)
    })

    return busboy
  }

  #abortOnError(queue, request, response) {
    return (busboy, filesUploaded = []) => {
      request.unpipe(busboy)
      queue.pause()

      logger.info('filesUploaded', filesUploaded)
      if (!request.aborted) {
        response.set('Connection', 'close')
        response.sendStatus(413)
      }
    }
  }

  #handleError(queue, request, response) {
    const filesUploaded = []
    const abort = this.#abortOnError(queue, request, response)
    return (busboy, fn) => {
      queue.add(async () => {
        try {
          const fileName = await fn()
          filesUploaded.push(fileName)
          logger.info('filesUploaded', filesUploaded)
          return fileName
        } catch (error) {
          abort(busboy, filesUploaded)
        }
      })
    }
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
    const { filename } = info
    const fileName = `${v4()}-${filename}`
    await this.#pipeStreamToStorage(file, fileName)

    logger.info(`File [${fileName}] finished!`)

    return fileName
  }
}

module.exports = UploadHandler
