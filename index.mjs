import dotenv from 'dotenv';
import fetch from 'node-fetch';
import AWS from 'aws-sdk';
import twilio from 'twilio';
import pLimit from 'p-limit';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

let startDate = '2023-01-01';
let endDate = '2024-01-01';
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const maxRetries = 3;
const delayBetweenRetries = 3000; // 3 seconds

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: process.env.AWS_REGION
});

// Create a limit function to restrict concurrent operations to 5
const limit = pLimit(10);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteRecordings() {
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`Beginning process to copy and delete call recordings between: ${start} and ${end}`);

    let date = new Date(start);
    while (date <= end) {
        console.log(`Processing date: ${date.toISOString().split('T')[0]}`);

        try {
            const recordings = await client.recordings.list({ dateCreated: date });
            console.log(`Found ${recordings.length} recordings for date ${date.toISOString().split('T')[0]}`);

            await Promise.all(recordings.map(r => limit(() => processRecording(r, date)))); // Limit to 5 concurrent operations
        } catch (error) {
            console.error(`Error retrieving recordings for date ${date.toISOString().split('T')[0]}:`, error);
        }

        date.setDate(date.getDate() + 1);
    }

    console.log("\nComplete. All recordings for configured timeframe have been copied to S3 and deleted from Twilio.");
}

async function processRecording(recording, date) {
    const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    const formattedDate = date.toISOString().split('T')[0];
    //S3 key format: <callSid>-<date>-<recordingSid>.mp3 can be changed if needed
    const s3Key = `${recording.callSid}-${formattedDate}-${recording.sid}.mp3`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(recordingUrl, {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const mp3Buffer = Buffer.from(arrayBuffer);

            const params = {
                Bucket: bucketName,
                Key: s3Key,
                Body: mp3Buffer,
                ContentType: 'audio/mpeg'
            };

            await s3.upload(params).promise();
            console.log(`Recording ${recording.sid} copied to S3 as ${s3Key}`);

            await client.recordings(recording.sid).remove();
            console.log(`Recording ${recording.sid} deleted from Twilio`);
            break; // Exit the loop on success
        } catch (error) {
            console.error(`Attempt ${attempt} - Failed to process recording ${recording.sid}:`, error);

            if (attempt < maxRetries) {
                console.log(`Retrying in ${delayBetweenRetries / 1000} seconds...`);
                await delay(delayBetweenRetries);
            } else {
                console.error(`Recording ${recording.sid} failed after ${maxRetries} attempts.`);
            }
        }
    }
}

deleteRecordings();
