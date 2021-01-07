const { createWriteStream } = require("fs");
const { logger } = require("./util");
const { v4 } = require("uuid");
const { join } = require("path");

module.exports = class LocalStorageService {
  createWritableStreamToLocal(fileName) {
    const saveFileTo = join(
      __dirname,
      "..",
      "downloads",
      `${v4()}-${fileName}`
    );
    logger.info("Uploading: " + saveFileTo);
    return createWriteStream(saveFileTo);
  }
};
