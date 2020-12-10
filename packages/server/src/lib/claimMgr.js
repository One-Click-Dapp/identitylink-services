// import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver'
import { DID } from 'dids'
import KeyResolver from '@ceramicnetwork/key-did-resolver'

const didJWT = require('did-jwt')

class ClaimMgr {
  constructor() {
    this.signerPrivate = null
    this.signerPublic = null
  }

  isSecretsSet() {
    return this.signerPrivate !== null && this.signerPublic !== null
  }

  async setSecrets(secrets) {
    this.signerPrivate = secrets.KEYPAIR_PRIVATE_KEY
    this.signerPublic = secrets.KEYPAIR_PUBLIC_KEY
    this.resolver = {
      registry: {
        ...KeyResolver.getResolver()
        // ...ThreeIdResolver.getResolver(),
      }
    }
  }

  async issue({ verification_url, username, did, type, userId }) {
    if (!username) throw new Error('No username provided')
    if (!did) throw new Error('No did provided')
    if (!type) throw new Error('No type provided')
    if (!(verification_url || userId))
      throw new Error('No verification url or user ID provided')
    const signer = didJWT.SimpleSigner(this.signerPrivate)
    return didJWT
      .createJWT(
        {
          sub: did,
          nbf: Math.floor(Date.now() / 1000),
          vc: {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential'],
            credentialSubject: {
              account: {
                type: type,
                username,
                ...(verification_url && { url: verification_url }),
                ...(userId && { id: userId })
              }
            }
          }
        },
        {
          issuer:
            'did:web:r27sfer037.execute-api.us-west-2.amazonaws.com/develop',
          signer
        }
      )
      .then(jwt => {
        return jwt
      })
      .catch(err => {
        console.log(err)
      })
  }

  decode(jwt) {
    if (!this.signerPublic) throw new Error('no keypair created yet')
    return didJWT.decodeJWT(jwt)
  }

  getPublicKeyHex() {
    if (!this.signerPublic) throw new Error('no keypair created yet')
    return this.signerPublic
  }

  async verifyToken(token) {
    if (!token) throw new Error('no token')
    return didJWT.verifyJWT(token, { resolver: this.resolver })
  }

  async verifyJWS(jws) {
    if (!jws) throw new Error('no jws')
    const did = new DID({
      resolver: KeyResolver.getResolver()
    })
    const { kid, payload } = await did.verifyJWS(jws)
    return { kid, payload, did: kid.split('#')[0] }
  }
}

module.exports = ClaimMgr
