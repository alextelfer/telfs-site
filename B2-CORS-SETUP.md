# B2 CORS Configuration

To allow direct uploads from your website to B2, you need to configure CORS rules on your bucket.

## Recommended Method: Use B2 Web Interface

1. Go to https://secure.backblaze.com/b2_buckets.htm
2. Click on your bucket
3. Go to "Bucket Settings"
4. Add CORS rules in JSON format:

```json
[
  {
    "corsRuleName": "allowWebUploads",
    "allowedOrigins": ["https://www.telfs.ca", "http://localhost:3000"],
    "allowedOperations": ["b2_upload_file", "b2_upload_part"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["x-bz-content-sha1"],
    "maxAgeSeconds": 3600
  }
]
```

## Alternative: Use B2 CLI (Python Required)

If you prefer using the command line:

1. **Install B2 CLI** (requires Python):
   ```bash
   pip install b2
   ```

2. **Authorize B2 CLI**:
   ```bash
   b2 account authorize YOUR_KEY_ID YOUR_APPLICATION_KEY
   ```

3. **List your buckets** (to get the bucket name):
   ```bash
   b2 bucket list
   ```

4. **Update Bucket CORS Rules**:
   ```bash
   b2 bucket update YOUR_BUCKET_NAME allPrivate --cors-rules '[{"corsRuleName":"allowWebUploads","allowedOrigins":["https://www.telfs.ca","http://localhost:3000"],"allowedOperations":["b2_upload_file","b2_upload_part"],"allowedHeaders":["*"],"exposeHeaders":["x-bz-content-sha1"],"maxAgeSeconds":3600}]'
   ```

Replace:
- `YOUR_KEY_ID` with your B2 application key ID
- `YOUR_APPLICATION_KEY` with your B2 application key
- `YOUR_BUCKET_NAME` with your B2 bucket name
- `allPrivate` with `allPublic` if your bucket is public
