# Twilio Recording Copier and Deleter

This script copies call recordings from Twilio to an AWS S3 bucket and then deletes the recordings from Twilio. It processes recordings within a specified date range and supports retries for failed operations.

## Prerequisites

- Node.js (>= 14.x)
- AWS account with an S3 bucket and necessary permissions
- Twilio account with call recordings
- `.env` file with required environment variables

## Installation

1. Clone the repository or download the script files.

2. Install the required dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```dotenv
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_SESSION_TOKEN=your_aws_session_token (optional)
   AWS_REGION=your_aws_region
   AWS_S3_BUCKET_NAME=your_s3_bucket_name
   ```

## Configuration

- **startDate**: The starting date for fetching recordings (format: `YYYY-MM-DD`).
- **endDate**: The ending date for fetching recordings (format: `YYYY-MM-DD`).
- **maxRetries**: The number of retry attempts for failed operations.
- **delayBetweenRetries**: The delay between retries (in milliseconds).

These settings can be modified directly in the script if needed.

## Usage

Run the script using the following command:

```bash
node your-script-name.js
```

The script will:

1. Retrieve all call recordings from Twilio within the specified date range.
2. Copy each recording to the specified S3 bucket with the filename format `<callSid>-<date>-<recordingSid>.mp3`.
3. Delete the recording from Twilio after successful upload to S3.

## Logging

The script logs the progress of each operation, including successes, retries, and failures. All logs are output to the console.

## Error Handling

- The script will retry failed operations up to the specified `maxRetries`.
- If an operation fails after all retry attempts, it will log an error message.