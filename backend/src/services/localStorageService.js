const { createWriteStream } = require("fs");
const { join } = require("path");
const { v4 } = require("uuid");
const { logger } = require("../util");

module.exports = class LocalStorageService {
  createWritableStreamToLocal(fileName) {
    const saveFileTo = join(
      process.cwd(),
      "downloads",
      `${v4()}-${fileName}`
    );
    logger.info("Uploading: " + saveFileTo);
    return createWriteStream(saveFileTo);
  }
};
