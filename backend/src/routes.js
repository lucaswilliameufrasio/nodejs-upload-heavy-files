const UploadHandler = require("./handlers/uploadHandler");

class Routes {
  #io;
  #uploadHandler
  constructor(io) {
    this.#io = io;
    this.#uploadHandler = new UploadHandler(this.#io);
  }

  async options(request, response) {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST",
    });

    response.end();
  }

  async post(request, response) {
    await this.#uploadHandler.handle(request, response)
  }
}

module.exports = Routes;
