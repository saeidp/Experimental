import { Handler, APIGatewayProxyResult } from 'aws-lambda';
import AWS = require('aws-sdk');

const indexName = 'Category-SK-index';
const tableName = process.env.TABLE_NAME || "xray-david-performance";

interface EventRequestData {
    group?: string,
    region?: string,
    period_from: string,
    period_to: string
}

interface EventResponseItem {
    group: string,
    period_from: string,
    period_to: string,
    duration: {
        method: string,
        max: number,
        min: number,
        median: number,
    }[];
}

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

///////////////////////////////////////////////////////////////////////////////
async function findData(region: string, catName: string, from: Date, to: Date) {
    const queryParams: AWS.DynamoDB.QueryInput = {
        TableName: tableName,
        IndexName: indexName,
        ExpressionAttributeValues: {
          ':cat':  { S: catName },
          ':from': { S: from.toISOString() },
          ':to':   { S: to.toISOString() }
        },
        KeyConditionExpression: 'Category = :cat AND SK BETWEEN :from AND :to',
    };

    const db = new AWS.DynamoDB({
        region
    });
    const data = await db.query(queryParams).promise();
    //console.log("data=", data);
    return data;
}

///////////////////////////////////////////////////////////////////////////////
async function getData(region: string, period_from: string, period_to: string, group: string): Promise<EventResponseItem | undefined> {
    const from = new Date(period_from);
    const   to = new Date(period_to);

    console.log("Get data from group: ", group);
    const data = await findData(region, group, from, to);
    console.log("item count: ", data.Count);

    if (!data.$response.data) {
        throw new Error(`Error ${data.$response.error}`);
    }

    const items: AWS.DynamoDB.QueryOutput = data.$response.data;
    if (items.Count === 0 || !items.Items) {
        console.log("No data retrieved.");
        return undefined;
    }

    const methods = items.Items.map(item => item.Method.S)
                            .filter(item => item != undefined)
                            .reduce((unique, item) => unique?.includes(item) ? unique : [ ...unique, item ], []);
    console.log("methods=", methods, " on group: ", group);

    const result: EventResponseItem = {
        group, period_from, period_to,
        duration: []
    };

    for (const method of methods) {
        if (!method) {
            continue;
        }
        console.log(method);
        const durations = items.Items.filter(item => item.Method.S === method)
                            .map(item => item.Duration.N)
                            .filter(item => item != undefined)
                            .map(item => Number(item))
                            .sort((a,b) => a - b);
        //console.log("durations=", durations);
        const max = durations[durations.length - 1];
        const min = durations[0];
        const lowMiddle = Math.floor((durations.length - 1) / 2);
        const highMiddle = Math.ceil((durations.length - 1) / 2);
        const median = (durations[lowMiddle] + durations[highMiddle]) / 2;
        console.log("  max=", max, ", min=", min, ", median=", median);
        result.duration.push({
            method, max, min, median
        });
    };
    return result;
}


///////////////////////////////////////////////////////////////////////////////
export const handle: Handler = async (event) => {
    console.log("Event: ", event);
    if (!event.headers) {
        return Response(400);
    }

    const header: EventRequestData = JSON.parse(JSON.stringify(event.headers));
    console.log("from: ", header.period_from);
    console.log("to: ", header.period_to);
    console.log("group: ", header.group);

    let region = AWS.config.region || "us-east-1";
    if (header.region) {
        region = header.region;
    }
    console.log("request data from region: ", region);

    const groups = [
        "SCIM /User", "SCIM /User/{id}", "SCIM /Group", "SCIM /Group/{id}",
        "/extend-claims", "/rotate-key", "/workspaces",
        "/Claim", "/Claim/{id}", "/Claim/search",
        "/Scope", "/Scope/{id}", "/Scope/search",
        "/Scope/Claim", "/Scope/Claim/{id}", "/Scope/Claim/search", "/Claim/{id}/Scope", "/performance"
    ];

    try {

        const result: EventResponseItem[] = [];
        const promises = groups.map(async group => {
            // specific group requested
            if (header.group) {
                if (group == header.group) {
                    return getData(region, header.period_from, header.period_to, group);
                } else {
                    return [];
                }
            } else {
                return getData(region, header.period_from, header.period_to, group);
            }

        });

        let data = await Promise.all(promises);
        data.forEach(item => {
            if (item) {
                result.push(item);
            }
        });

        console.log("all results from groups: ", JSON.stringify(result, null, 2));
        return Response(200, result);
    }
    catch (error) {
        console.log('Could not handle API request. Error: ', error);
        return Response(500);
    }
}
