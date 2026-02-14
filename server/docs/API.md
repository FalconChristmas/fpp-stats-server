# FPP Stats Server API Documentation

This API provides statistics collection and retrieval services for FalconPlayer (FPP) instances. The server runs on port 7654 by default.

## Table of Contents
- [Authentication](#authentication)
- [Endpoints](#endpoints)
    - [Root Redirect](#1-root-redirect)
    - [Health Check](#2-health-check)
    - [Simple Status](#3-simple-status)
    - [Summary Statistics (All Data)](#4-summary-statistics-all-data)
    - [Summary Statistics (Filtered)](#5-summary-statistics-filtered)
    - [Upload Statistics](#6-upload-statistics)
    - [FPP Git Commits](#7-fpp-git-commits)
    - [Archive Download](#8-archive-download)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [CORS](#cors)
- [Data Retention](#data-retention)
- [Environment Configuration](#environment-configuration)
- [Logging](#logging)


## Authentication
- Most endpoints are publicly accessible
- Archive download requires a valid `DOWNLOAD_KEY` in the URL path that is set via an environment variable.



- Upload operations require valid JSON payload structure

---

## Endpoints

### 1. Root Redirect
**GET /** 

Redirects to the main FalconChristmas website.

**Response:**
- Status: 302 Redirect to `http://falconchristmas.com/`

---

### 2. Health Check
**GET /health**

Returns the health status of the server and GitHub API connectivity. Can be used by
automatic probes to determine if GitHub API is failing.

**Response Format:**
```json
{
  "status": "OK|WARNING",
  "github": {
    "last_updated": "2026-02-14T13:24:50.829Z",
    "differenceInSeconds": 9
  }
}
```

**Response Details:**
- `status`: "OK" if GitHub data is recent (< 500 seconds old), "WARNING" if older
- `github.last_updated`: Timestamp of last GitHub data update
- `github.differenceInSeconds`: Seconds since last update

**Example:**
```bash
curl http://localhost:7654/health
```

---

### 3. Simple Status
**GET /status**

If the server is running, returns a simple pay load.  Doesn't preform any other checks like the 
`/health` probe does.
**Response Format:**
```json
{
  "status": "OK"
}
```

**Example:**
```bash
curl http://localhost:7654/status
```

---

### 4. Summary Statistics (All Data)
**GET /summary**

Returns complete FPP device statistics summary including Docker and non-Docker instances.

**Response Format:**
```json
{
  "summary": {
    "totalInstances": 1234,
    "platforms": {...},
    "versions": {...},
    // ... extensive statistics data
  },
  "last_updated": "2026-02-14T13:24:50.829Z"
}
```

**Example:**
```bash
curl http://localhost:7654/summary
```

---

### 5. Summary Statistics (Filtered)
**GET /summary/{docker}**

Returns FPP usage statistics filtered by Docker usage.

**Parameters:**
- `docker`: 
  - `"false"` - Returns statistics excluding Docker instances
  - Any other value - Returns all statistics (same as `/summary`)

**Response Format:**
Same as `/summary` endpoint but with filtered data.

**Examples:**
```bash
# Get stats excluding Docker instances
curl http://localhost:7654/summary/false

# Get all stats (equivalent to /summary)
curl http://localhost:7654/summary/true
```

---

### 6. Upload Statistics
**POST /upload**

Accepts FPP instance statistics data for collection and analysis from FPP devices.

**Request Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "uuid": "unique-instance-identifier",
  "platform": "Raspberry Pi",
  "version": "7.0",
  // ... additional FPP instance data
}
```

**Request Validation:**
- Payload must be valid JSON
- Must contain a `uuid` field
- UUID must contain only alphanumeric characters and hyphens
- Maximum payload size: 100,000 bytes
- UUID format: `/^[A-Za-z0-9\-]+$/`

**Response Format:**
```json
{
  "status": "OK|Error Message",
  "uuid": "submitted-uuid"
}
```

**Response Status Values:**
- `"OK"` - Successfully uploaded
- `"Not JSON"` - Invalid JSON format
- `"Not JSON Object"` - JSON is not an object
- `"Invalid Record"` - Missing required uuid field
- `"Invalid UUID Format"` - UUID contains invalid characters
- `"Payload too large"` - Exceeds 100KB limit
- `"Error occured during save"` - Server storage error

**Example:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"uuid":"test-instance-123","platform":"Raspberry Pi","version":"7.0"}' \
  http://localhost:7654/upload
```

---

### 7. FPP Git Commits
**GET /fpp_commits**

Returns cached FPP Git repository branch and release information from GitHub.  The `branches` 
section outlines the last commit for every branch, while the `release` section can be used
to list the releaes and how my assets each has.

**Response Format:**
```json
{
  "branches": [
    {
      "name": "master",
      "commit": {
        "sha": "e963d9fdba67edda4ee4672f4eaa68d8f6c36da0",
        "url": "https://api.github.com/repos/FalconChristmas/fpp/commits/...",
        "message": "Fix compile on Pi",
        "date": "2026-02-13T17:37:14Z",
        "date_epoch": 1771004234
      },
      "protected": false
    }
  ],
  "releases": [
    {
      "url": "https://api.github.com/repos/FalconChristmas/fpp/releases/...",
      "html_url": "https://github.com/FalconChristmas/fpp/releases/tag/9.5",
      "id": 275004304,
      "tag_name": "9.5",
      "target_commitish": "master",
      "name": "9.5",
      "draft": false,
      "prerelease": false,
      "created_at": "2026-01-07T23:18:29Z",
      "updated_at": "2026-01-24T19:30:55Z",
      "published_at": "2026-01-08T03:09:40Z",
      "body": "Release notes and changelog...",
      "asset_cnt": 18
    }
  ],
  "last_updated": "2026-02-14T13:39:26.555Z"
}
```

**Response Details:**
- `branches`: Array of FPP Git branches with commit information
  - `name`: Branch name (e.g., "master", "v9.5")
  - `commit`: Latest commit details including SHA, URL, message, and timestamps
  - `protected`: Whether the branch is protected
- `releases`: Array of FPP GitHub releases
  - `tag_name`: Release version tag
  - `name`: Release display name
  - `body`: Release notes and changelog
  - `created_at`, `updated_at`, `published_at`: Release timestamps
  - `draft`, `prerelease`: Release status flags
  - `asset_cnt`: Number of downloadable assets
- `last_updated`: Timestamp when GitHub data was last cached

**Example:**
```bash
curl http://localhost:7654/fpp_commits
```

**Note:** This endpoint returns cached GitHub data that is periodically refreshed from the FalconChristmas/fpp repository.

---

### 8. Archive Download
**GET /archive/{DOWNLOAD_KEY}**

Downloads a ZIP archive containing all collected statistics data.

**Parameters:**
- `DOWNLOAD_KEY`: Secret key required for access (configured via environment variable)

**Response:**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="archive.zip"`
- Body: ZIP file containing all collected data

**Example:**
```bash
curl -o archive.zip http://localhost:7654/archive/your-secret-download-key
```

**Security Notes:**
- Download key must be configured in server environment
- Access is logged for security monitoring
- Contains sensitive usage statistics data

---

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `302` - Redirect (root endpoint)
- `400` - Bad Request (invalid data format)
- `404` - Not Found (invalid endpoint or missing file)
- `500` - Internal Server Error

Error responses typically include:
```json
{
  "status": "Error description",
  "uuid": "relevant-uuid-if-applicable"
}
```

---

## Environment Configuration

Required environment variables:
- `API_KEY`: GitHub API access token
- `DOWNLOAD_KEY`: Secret key for archive access
- `port`: Server port (default: 7654)

## Logging
- Upload errors are logged with severity levels
- Archive downloads are logged for security
- GitHub API issues are tracked in health endpoint
