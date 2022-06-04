const BusBoy = require("busboy");
const url = require("url");
const GoogleCloudStorageService = require("../services/googleCloudStorageService");
const LocalStorageService = require("../services/localStorageService");
const { logger, pipelineAsync } = require("../util");

const localStorageService = new LocalStorageService();
const storageService = new GoogleCloudStorageService();

const ON_UPLOAD_EVENT = "file-uploaded";
const STORAGE_SERVICE = process.env.STORAGE_SERVICE || "local";

class UploadHandler {
  #io;
  #socketId;
  constructor(io) {
    this.#io = io;
  }

  async handle(request, response) {
    const { headers } = request
    const {
      query: { socketId },
    } = url.parse(request.url, true);
    this.#socketId = socketId

    const onFinish = (response) => () => {
      response.writeHead(201, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST",
      })
      response.end();
    };

    const busboyInstance = this.registerEvents(
      headers,
      onFinish(response)
    );

    await pipelineAsync(request, busboyInstance);

    logger.info("Request finished with success!");
  }

  registerEvents(headers, onFinish) {
    const busboy = new BusBoy({ headers });

    busboy.on("file", this.#onFile.bind(this));

    busboy.on("finish", onFinish);

    return busboy;
  }

  #handleFileBytes() {
    async function* handleData(data) {
      for await (const item of data) {
        const size = item.length;
        this.#io.to(this.#socketId).emit(ON_UPLOAD_EVENT, size);
        yield item;
      }
    }
    return handleData.bind(this);
  }

  async #pipeStreamsToLocalStorage(file, fileName) {
    await pipelineAsync(
      file,
      this.#handleFileBytes.bind(this),
      localStorageService.createWritableStreamToLocal(fileName)
    );
  }

  async #pipeStreamsToGoogleCloudStorage(file, fileName) {
    await pipelineAsync(
      file,
      this.#handleFileBytes.apply(this, [fileName]),
      storageService.createWritableStreamToGCS(fileName)
    );
  }

  async #onFile(fieldName, file, fileName) {
    STORAGE_SERVICE === "gcs"
      ? await this.#pipeStreamsToGoogleCloudStorage(file, fileName)
      : await this.#pipeStreamsToLocalStorage(file, fileName);

    logger.info(`File [${fileName}] finished!`);
  }
}

module.exports = UploadHandler;
