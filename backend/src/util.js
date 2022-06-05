const logger = require('pino')({
  transport: {
    target: 'pino-pretty',
    options: {
      ignore: 'pid,hostname',
    },
  },
})

const { promisify } = require('util')
const { pipeline } = require('stream')
const pipelineAsync = promisify(pipeline)

module.exports = {
  logger,
  pipelineAsync,
  promisify,
}
