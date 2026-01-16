import { gapi } from 'gapi-script';
import { GOOGLE_CONFIG } from '../config';

// To manage GAPI state
let isGapiClientInited = false;

export class GoogleDriveService {

    /**
     * Initializes the GAPI client for file operations.
     * Must be called once when the app starts or when Drive features are first accessed.
     */
    static async initClient() {
        if (isGapiClientInited) return;

        return new Promise<void>((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: GOOGLE_CONFIG.API_KEY,
                        discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
                    });
                    isGapiClientInited = true;
                    console.log('GAPI client initialized');
                    resolve();
                } catch (err) {
                    console.error('Error initializing GAPI client', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * Set the access token for GAPI calls. 
     * This comes from the GoogleLogin onSucccess or useGoogleLogin hook.
     */
    static setAccessToken(token: string) {
        if (!token) return;
        // Ensure gapi.client exists before setting token to prevent crash
        if (gapi && gapi.client) {
            gapi.client.setToken({ access_token: token });
        } else {
            console.warn("GAPI client not ready, skipping setToken");
        }
    }

    /**
     * List PDF files from Drive.
     * Uses query to filter by mimeType and trashed status.
     */
    static async listPdfFiles() {
        if (!isGapiClientInited) await this.initClient();

        try {
            const response = await gapi.client.drive.files.list({
                'pageSize': 20,
                'fields': "nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink)",
                'q': "mimeType = 'application/pdf' and trashed = false"
            });
            return response.result.files || [];
        } catch (err) {
            console.error("Error listing files", err);
            throw err;
        }
    }

    /**
     * Download a file's content as a Blob.
     * Note: For GAPI, we usually use the 'alt=media' param or fetch via URL with headers.
     * Using pure fetch here to avoid some GAPI complexities with binary data.
     */
    static async downloadFile(fileId: string, accessToken: string): Promise<Blob> {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        return await response.blob();
    }

    /**
     * Create (or find) the application folder.
     */
    static async getOrCreateFolder(folderName: string = "ReportInsight_Scraps") {
        if (!isGapiClientInited) await this.initClient();

        // Check if folder exists
        const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
        const response = await gapi.client.drive.files.list({ q, fields: 'files(id)' });

        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        }

        // Create if not exists
        const fileMetadata = {
            'name': folderName,
            'mimeType': 'application/vnd.google-apps.folder'
        };
        const createResponse = await gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });

        return createResponse.result.id;
    }

    /**
     * Upload an image (Blob/File) to the specific folder.
     */
    static async uploadImage(blob: Blob, fileName: string, folderId: string, accessToken: string) {
        // We use the multipart upload method via fetch because gapi upload is complex
        // Or simpler: Resumable upload or simple upload endpoint.
        // For images < 5MB, simple upload is fine.

        const metadata = {
            name: fileName,
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: form
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Upload failed: ${err}`);
        }

        return await response.json();
    }
}
