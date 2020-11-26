class GithubVerifyHandler {
  constructor(githubMgr, claimMgr, analytics) {
    this.name = 'GithubVerifyHandler'
    this.githubMgr = githubMgr
    this.claimMgr = claimMgr
    this.analytics = analytics
  }

  async handle(event, context, cb) {
    let body
    try {
      body = JSON.parse(event.body)
    } catch (e) {
      cb({ code: 400, message: 'no json body: ' + e.toString() })
      return
    }

    let domains = /https:\/\/(\w+\.)?(3box.io|foam.tools)/i

    if (
      !domains.test(event.headers.origin) &&
      !domains.test(event.headers.Origin)
    ) {
      cb({ code: 401, message: 'unauthorized' })
      this.analytics.trackVerifyGithub(body.did, 401)
      return
    }

    if (!body.jws) {
      cb({ code: 400, message: 'no jws' })
      this.analytics.trackVerifyGithub(body.did, 400)
      return
    }

    // TODO:  Get the username, did, and timestamp from storage?
    let verification_url = ''
    try {
      verification_url = await this.githubMgr.findDidInGists(
        body.github_handle,
        body.did
      )
    } catch (e) {
      cb({ code: 500, message: 'error while trying to verify the did' })
      this.analytics.trackVerifyGithub(body.did, 500)
      return
    }

    if (verification_url == '') {
      cb({ code: 400, message: 'no valid proof available' })
      this.analytics.trackVerifyGithub(body.did, 400)
      return
    }

    let verification_claim = ''
    try {
      verification_claim = await this.claimMgr.issueGithub(
        body.did,
        body.github_handle,
        verification_url
      )
    } catch (e) {
      cb({ code: 500, message: 'could not issue a verification claim' })
      this.analytics.trackVerifyGithub(body.did, 500)
      return
    }

    cb(null, { verification: verification_claim })
    this.analytics.trackVerifyGithub(body.did, 200)
  }
}
module.exports = GithubVerifyHandler
