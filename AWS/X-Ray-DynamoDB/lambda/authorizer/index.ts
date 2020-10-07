import { CustomAuthorizerHandler } from 'aws-lambda';
import { authenticate } from './lib';

export const handler: CustomAuthorizerHandler = async (event, context ) => {
  try {
    const data = await authenticate(event);
    return data;
  } catch (err) {
    console.log("Error Details--"+err);
    context.fail("Unauthorized");
    throw err;
  }
};
