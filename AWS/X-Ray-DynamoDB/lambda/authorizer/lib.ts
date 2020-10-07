import JwksClient = require('jwks-rsa');
import { promisify } from 'util';
import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

const gatewayARN = process.env.GW_ARN;
const issuer = process.env.AZURE_TOKEN_ISSUER;
const jwks_uri = process.env.AZURE_JWKS_URI;
const audience = process.env.AZURE_AUDIENCE;

interface AccessClaims {
    sub: string;
    scope: string;
    [key: string]: string | string[] | number;
}

const getPolicyDocument = (effect: 'Allow' | 'Deny', resource: string) => {
  const policyDocument = {
    Version: '2012-10-17', // default version
    Statement: [{
      Action: 'execute-api:Invoke', // default action
      Effect: effect,
      Resource: resource,
    }]
  };
  return policyDocument;
};

// extract and return the Bearer Token from the Lambda event parameters
const getToken = (event: CustomAuthorizerEvent) => {
  if (!event.type || event.type !== 'TOKEN') {
    throw new Error('Expected "event.type" parameter to have value "TOKEN"');
  }

  const tokenString = event.authorizationToken;
  if (!tokenString) {
    throw new Error('Expected "event.authorizationToken" parameter to be set');
  }

  const match = tokenString.match(/^Bearer (.*)$/);
  if (!match || match.length < 2) {
    throw new Error(`Invalid Authorization token - ${tokenString} does not match "Bearer .*"`);
  }
  return match[1];
};

let JWKS_AZURE_CLIENT: JwksClient.JwksClient | undefined;

export const authenticate = async (event: CustomAuthorizerEvent) => {

  if (!gatewayARN) {
    throw new Error('AWS Gateway ARN not set');
  }

  if (!issuer) {
    throw new Error('Must specify environment for AZURE_TOKEN_ISSUER');
  }

  if (!jwks_uri) {
    throw new Error('Must specify environment for AZURE_JWKS_URI');
  }

  if (!audience) {
    throw new Error('Must specify environment for AZURE_AUDIENCE');
  }

  const token = getToken(event);
  const decoded = jwt.decode(token, { complete: true });
  if (decoded === null || typeof decoded === 'string') {
      console.log("Unable to decode token: ", token);
      throw new Error('token not decoded as object');
  }
  if (!decoded || !decoded.header || !decoded.header.kid) {
      console.log("Unable to verify header or kid: ", token);
      throw new Error('invalid token');
  }
  console.log("decoded=", decoded);  // todo

  console.log("Azure token");
  console.log("jwks_uri=", jwks_uri);
  console.log("issuer=", issuer);
  console.log("audience=", audience);

  // Azure
  const iss = decoded.payload && decoded.payload.iss && decoded.payload.iss.toString() || "";
  const aud = decoded.payload && decoded.payload.aud && decoded.payload.aud.toString() || "";
  if (iss != issuer || aud != audience) {
      console.log("Unable to verify issuer or audience: ", token);
      throw new Error('Invalid JWT sub');
  }

  if (!JWKS_AZURE_CLIENT) {
    JWKS_AZURE_CLIENT = JwksClient({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10, // Default value
      jwksUri: jwks_uri
    });
  }
  const getSigningKey = promisify(JWKS_AZURE_CLIENT.getSigningKey);

    const key = await getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();
    if (!signingKey) {
        console.log("Unable to verify key: ", token);
        throw new Error('Could not get signing key from decoded token');
    }

  const jwtOptions = {
    algorithm: 'HS256',
    issuer,
    encoding: 'RS256'
  };
  console.log("jwtOptions: ", jwtOptions);

    const verified = jwt.verify(token, signingKey, jwtOptions);
    if (!verified || typeof verified !== 'object') {
        console.log("Unable to verify token: ", token);
        throw new Error('Expected JWT to verify as an object')
    };
    const verfiedClaims = verified as AccessClaims;
    if (!verfiedClaims.sub) {
        console.log("Unable to verify sub: ", token);
        throw new Error('JWT missing expected claims sub');
    }

    let result: CustomAuthorizerResult = {
        principalId: verfiedClaims.sub,
        policyDocument: getPolicyDocument(
            'Allow',
            gatewayARN
        ),
    };
    console.log("Allowed!");
    return result;
}