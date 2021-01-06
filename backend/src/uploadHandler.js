const BusBoy = require("busboy");
const { logger, pipelineAsync } = require("./util");
const GoogleCloudStorageService = require("./googleCloudStorageService");
const LocalStorageService = require("./localStorageService");

const localStorageService = new LocalStorageService();
const storageService = new GoogleCloudStorageService();

const ON_UPLOAD_EVENT = "file-uploaded";
const STORAGE_SERVICE = process.env.STORAGE_SERVICE || "local";

class UploadHandler {
  #io;
  #socketId;
  storageService;
  constructor(io, socketId, storageService) {
    this.#io = io;
    this.#socketId = socketId;
    this.storageService = storageService;
  }

  registerEvents(headers, onFinish) {
    const busboy = new BusBoy({ headers });

    busboy.on("file", this.#onFile.bind(this));

    busboy.on("finish", onFinish);

    return busboy;
  }

  #handleFileBytes(fileName) {
    async function* handleData(data) {
      for await (const item of data) {
        const size = item.length;
        this.#io.to(this.#socketId).emit(ON_UPLOAD_EVENT, size);
        yield item;
      }
    }
    return handleData.bind(this);
  }

  async #pipeStreamsToLocalStorage(file, fileName, saveFileTo) {
    await pipelineAsync(
      file,
      this.#handleFileBytes.apply(this, [fileName]),
      localStorageService.createWriteStream(saveFileTo)
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
      : await this.#pipeStreamsToLocalStorage(file, fileName, saveFileTo);

    logger.info(`File [${fileName}] finished!`);
  }
}

module.exports = UploadHandler;
