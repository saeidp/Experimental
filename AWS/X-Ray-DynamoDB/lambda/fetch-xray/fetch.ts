
import AWS = require('aws-sdk');
const db = new AWS.DynamoDB();
const xray = new AWS.XRay();

const tableName = process.env.TABLE_NAME;
// fetch the recent X hours contents
const hours = process.env.SCAN_HOURS || "12";

interface RawData {
    id: string,
    method: string,
    url: string,
    time: string,
    duration: number,
    service?: []
}

async function getTraceSummaries(from: Date, to: Date): Promise<RawData[]> {
    console.log("Fetch data from ", from.toISOString(), " to ", to.toISOString());
    let object: RawData[] = [];
    let nextToken: string | undefined = '';
    while (nextToken == '' || nextToken != null) {
        const params: AWS.XRay.Types.GetTraceSummariesRequest = {
            EndTime:   to,
            StartTime: from,
            NextToken: nextToken,
        };
        const reply = await xray.getTraceSummaries(params).promise();
        if (!reply.$response.data) {
            const errMsg = reply.$response.error;
            console.error(`Error ${errMsg}`);
            throw new Error(`Error ${errMsg}`);
        }
        const data = reply.$response.data;
        //console.log(data);           // successful response
        if (data && data.ApproximateTime) {
            const time = new Date(data.ApproximateTime).toISOString();
            data.TraceSummaries?.forEach(item => {
                if (item.Http && item.Http.HttpURL) {
                    const id = item.Id || "";
                    const url = item.Http.HttpURL;
                    const method = item.Http?.HttpMethod || "Unknown";
                    const duration = item.Duration || 0;
                    //const service = item.ResponseTimeRootCauses?.map(causes => causes.Services?.map(svr => svr.Type));
                    const output: RawData = {
                        id, method, url, duration, time // service,
                    }
                    //console.log(JSON.stringify(output, null, 2));
                    object.push(output);
                }
            });
        }
        nextToken = data.NextToken;
    }
    console.log("Retrieved ", object.length, " records.");
    return object;
}

async function saveToDB(data: RawData)
{
    if (!tableName) {
        throw new Error('Lambda requires TABLE_NAME to be defined');
    }

    const group_name = await getCategoryName(data.url);
    const env = getEnvironmentFromURL(data.url);
    const add_params: AWS.DynamoDB.PutItemInput = {
        TableName: tableName,
        Item: {
            "PK":  { S: data.id },
            "SK":  { S: data.time },
            "Category": { S: group_name ? group_name : "Other"},
            "Method": { S: data.method ? data.method : "Unknown" },
            "URL": { S: data.url ? data.url : ""},
            "Environment": { S: env ? env : "Unknown"},
            "Duration": { N: data.duration ? data.duration.toString() : "0" }
        }
    };

    // Call DynamoDB to add the item to the table
    const putItemReply = await db.putItem(add_params).promise().catch(error => {
        throw new Error('Error: ' + error + '. Could not put item:' + JSON.stringify(add_params));
    });
    //console.log(`putItem(${JSON.stringify(add_params)}) => ${JSON.stringify(putItemReply)}`)

    if (!putItemReply.$response.data) {
        const errMsg = putItemReply.$response.error;
        throw new Error('Error: ' + errMsg + '. Could not add item:' + JSON.stringify(add_params));
    }
    return;
}

interface Statistics{
    name: string,
    pattern: string,
    stats: {
        method: string,
        duration: number
    }[];
}
async function getCategoryName(url: string)
{
    const scim_domain = 'https:\/\/scim[a-zA-Z0-9-]*.(dev.|uat.|sandbox.)?authz.fugro.com\/';
    const portal_domain = 'https:\/\/(portal|api)[a-zA-Z0-9-]*.(dev.|uat.|sandbox.)?authz.fugro.com\/';
    const perf_domain = 'https:\/\/perf[a-zA-Z0-9-]*.(dev.|uat.|sandbox.)?authz.fugro.com\/';
    let category: Statistics[] = [
        { name: "SCIM /User",       stats: [], pattern: scim_domain + "Users[\/]?$" },
        { name: "SCIM /User/{id}",  stats: [], pattern: scim_domain + "Users\/[a-zA-Z0-9-_]*[\/]?$" },
        { name: "SCIM /Group",      stats: [], pattern: scim_domain + "Groups[\/]?$" },
        { name: "SCIM /Group/{id}", stats: [], pattern: scim_domain + "Groups\/[a-zA-Z0-9-_]*[\/]?$" },

        { name: "/extend-claims",   stats: [], pattern: portal_domain + "extend-claims[\/]?$" },
        { name: "/rotate-key",      stats: [], pattern: portal_domain + "rotate-key[\/]?$" },
        { name: "/workspaces",      stats: [], pattern: portal_domain + "workspaces[\/]?$" },

        { name: "/Claim",           stats: [], pattern: portal_domain + "claim[\/]?$" },
        { name: "/Claim/{id}",      stats: [], pattern: portal_domain + "claim\/[a-zA-Z0-9-_]*[\/]?$" },
        { name: "/Claim/search",    stats: [], pattern: portal_domain + "claim\/search[\/]?$" },

        { name: "/Scope",           stats: [], pattern: portal_domain + "claim[\/]?$" },
        { name: "/Scope/{id}",      stats: [], pattern: portal_domain + "claim\/[a-zA-Z0-9-_]*[\/]?$" },
        { name: "/Scope/search",    stats: [], pattern: portal_domain + "claim\/search[\/]?$" },

        { name: "/Scope/Claim",      stats: [], pattern: portal_domain + "scope\/[a-zA-Z0-9-_]*\/claim[\/]?$" },
        { name: "/Scope/Claim/{id}", stats: [], pattern: portal_domain + "scope\/[a-zA-Z0-9-_]*\/claim\/[a-zA-Z0-9]*[\/]?$" },
        { name: "/Scope/Claim/search", stats: [], pattern: portal_domain + "scope\/[a-zA-Z0-9-_]*\/claim\/search[\/]?$" },

        { name: "/Claim/{id}/Scope",   stats: [], pattern: portal_domain + "claim\/[a-zA-Z0-9-_]*\/scope[\/]?$" },

        { name: "/performance",      stats: [], pattern: perf_domain + "performance[\/]?$" },
    ];


    for (const cat of category) {
        const regexp = new RegExp(cat.pattern, 'gis');
        if (regexp.test(url)) {
            //console.log("Match ", cat.name, "url: ", url);
            return cat.name;
        }
    }
    console.log("Unable to find the group: ", url);
    return undefined;
}

function getEnvironmentFromURL(url: string) {
    if (!url) {
        return undefined;
    }

    const domain = url.substr(0, url.indexOf('authz.fugro.com')).toLowerCase();
    const keywords = ['david', 'seema', 'ianw', 'clean', 'dev', 'uat', 'sandbox'];
    for (const word of keywords) {
        if (domain.indexOf(word) != -1)
            return word;
    }
    return 'prod';
}

export async function fetch(set_from?: string, set_to?: string) {
    try {
        const now = new Date().valueOf();
        let from = new Date(now - Number(hours) * 60 * 60 * 1000);
        let to   = new Date(now);

        // event parameter could overwrite the settings to fetch
        if (set_from && set_to) {
            from = new Date(set_from);
            to   = new Date(set_to);
        }

        const items = await getTraceSummaries(from, to);
        const promises = items.map(item => {
            return saveToDB(item).catch(error => {
                return Promise.reject(new Error(error));
            });
        })
        await Promise.all(promises);
    }
    catch (error) {
        console.log('Could not handle API request. Error: ', error);
    }
}