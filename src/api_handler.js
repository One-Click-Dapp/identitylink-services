// eslint-disable-next-line import/prefer-default-export
// const AWS = require('aws-sdk')

const TwitterRequestHandler = require('./api/twitter-request')
const TwitterVerifyHandler = require('./api/twitter-verify')
const GithubRequestHandler = require('./api/github-request')
const GithubVerifyHandler = require('./api/github-verify')
const DidDocumentHandler = require('./api/diddoc')

const TwitterMgr = require('./lib/twitterMgr')
const GithubMgr = require('./lib/githubMgr')
const ClaimMgr = require('./lib/claimMgr')
const Analytics = require('./lib/analytics')

let twitterMgr = new TwitterMgr()
let claimMgr = new ClaimMgr()
let githubMgr = new GithubMgr()
const analytics = new Analytics()

const doHandler = (handler, event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false
  handler.handle(event, context, (err, resp) => {
    let body = JSON.stringify({})
    if (handler.name === 'DidDocumentHandler') {
      body = JSON.stringify(resp)
    } else {
      body = JSON.stringify({
        status: 'success',
        data: resp
      })
    }
    let response
    if (err == null) {
      response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: body
      }
    } else {
      let code = 500
      if (err.code) code = err.code
      let message = err
      if (err.message) message = err.message

      response = {
        statusCode: code,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          status: 'error',
          message: message
        })
      }
    }

    callback(null, response)
  })
}

// Allow some env vars to overwrite KMS
const envConfig = {}
if (process.env.IPFS_PATH) envConfig['IPFS_PATH'] = process.env.IPFS_PATH
if (process.env.AWS_BUCKET_NAME)
  envConfig['AWS_BUCKET_NAME'] = process.env.AWS_BUCKET_NAME

const preHandler = (handler, event, context, callback) => {
  if (
    !twitterMgr.isSecretsSet() ||
    !claimMgr.isSecretsSet() ||
    !githubMgr.isSecretsSet()
  ) {
    // TODO: Uncomment for 3Box team deployment
    // const kms = new AWS.KMS()
    // kms
    //   .decrypt({ CiphertextBlob: Buffer.from(process.env.SECRETS, 'base64') })
    //   .promise()
    //   .then(data => {
    //     const decrypted = String(data.Plaintext)
    //     const config = Object.assign(JSON.parse(decrypted), envConfig)
    //     twitterMgr.setSecrets(config)
    //     githubMgr.setSecrets(config)
    //     return claimMgr.setSecrets(config)
    //     analytics.setSecrets(config)
    //   })
    //   .then(res => {
    //     doHandler(handler, event, context, callback)
    //   })
    const secretsFromEnv = {
      GITHUB_USERNAME: process.env.GITHUB_USERNAME,
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
      KEYPAIR_PRIVATE_KEY: process.env.KEYPAIR_PRIVATE_KEY,
      KEYPAIR_PUBLIC_KEY: process.env.KEYPAIR_PUBLIC_KEY,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      SEGMENT_WRITE_KEY: process.env.SEGMENT_WRITE_KEY,
      TWITTER_CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY,
      TWITTER_CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
    }
    const config = { ...secretsFromEnv, ...envConfig }
    analytics.setSecrets(config)
    githubMgr.setSecrets(config)
    claimMgr.setSecrets(config)
    twitterMgr.setSecrets(config)
    doHandler(handler, event, context, callback)
  } else {
    doHandler(handler, event, context, callback)
  }
}

let didDocumentHandler = new DidDocumentHandler(claimMgr)
module.exports.diddoc = (event, context, callback) => {
  preHandler(didDocumentHandler, event, context, callback)
}

let githubRequestHandler = new GithubRequestHandler(
  githubMgr,
  claimMgr,
  analytics
)

/// /////////////////////
// GITHUB
/// ////////////////////
module.exports.request_github = (event, context, callback) => {
  preHandler(githubRequestHandler, event, context, callback)
}

let githubVerifyHandler = new GithubVerifyHandler(
  githubMgr,
  claimMgr,
  analytics
)
module.exports.verify_github = (event, context, callback) => {
  preHandler(githubVerifyHandler, event, context, callback)
}

/// /////////////////////
// Twitter
/// ////////////////////
let twitterRequestHandler = new TwitterRequestHandler(
  twitterMgr,
  claimMgr,
  analytics
)
module.exports.request_twitter = (event, context, callback) => {
  preHandler(twitterRequestHandler, event, context, callback)
}

let twitterVerifyHandler = new TwitterVerifyHandler(
  twitterMgr,
  claimMgr,
  analytics
)
module.exports.verify_twitter = (event, context, callback) => {
  preHandler(twitterVerifyHandler, event, context, callback)
}

/// /////////////////////
// Discord
/// ////////////////////
