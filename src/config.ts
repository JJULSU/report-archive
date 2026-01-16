// Google API Configuration
// You can obtain these credentials from the Google Cloud Console: https://console.cloud.google.com/
// 1. Create a Project
// 2. Enable "Google Drive API"
// 3. Create Credentials -> OAuth client ID (Application type: Web application)
//    - Authorized JavaScript origins: http://localhost:5173 (and your production URL)
//    - Authorized redirect URIs: http://localhost:5173 (and your production URL)
// 4. Create Credentials -> API Key

export const GOOGLE_CONFIG = {
    CLIENT_ID: "306344795062-3tk2ap7511ur7um8f227np5ancgvuljk.apps.googleusercontent.com",
    API_KEY: "AIzaSyCRu8VNp-YJvGflFQOUOw6CWJl9I79E-s4",
    SCOPES: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly",
    DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
};
