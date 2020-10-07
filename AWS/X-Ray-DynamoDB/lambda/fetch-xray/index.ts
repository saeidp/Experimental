import { Handler, APIGatewayProxyResult } from 'aws-lambda';
import { fetch } from './fetch';

const allowOrigins = process.env.ALLOW_ORIGINS || '';
const corsHeaders = {
    'Access-Control-Allow-Headers':  'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
    'Access-Control-Allow-Origin': allowOrigins
};

export function Response(code: number, body?: object, extraHeaders?: { [key: string]: string }): APIGatewayProxyResult {
    return {
        statusCode: code,
        body: body ? JSON.stringify(body) : '{}',
        isBase64Encoded: false,
        headers: {
            ...extraHeaders,
            ...corsHeaders,
            'content-type': 'application/json'
        }
    };
}

export const handle: Handler = async (event) => {
    console.log("Event: ", event);
    try {
        // time_from and time_to can be set from event parameter.
        // String format: "2020-07-28T00:00:00.000Z"
        if (event.time_from && event.time_to) {
            await fetch(event.time_from, event.time_to);
        }
        else
        {
           await fetch();
        }
    }
    catch (error) {
        console.log('Could not handle API request. Error: ', error);
    }

    console.log("End");
    return Response(200);
}
