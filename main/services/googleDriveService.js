const { google } = require('googleapis');
const stream = require('stream');

class GoogleDriveService {
  constructor() {
    this.SCOPES = ['https://www.googleapis.com/auth/drive'];
    
    try {
      // Ambil credentials dari environment variable
      const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS.trim());
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: this.SCOPES,
      });
      
      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      console.error('Error initializing Google Drive Service:', error);
      throw new Error('Failed to initialize Google Drive credentials');
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType, folderId) {
    try {
      // Validasi input
      if (!fileBuffer || !fileName || !mimeType || !folderId) {
        throw new Error('Missing required parameters for file upload');
      }

      // Buat stream dari buffer
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

      const media = {
        mimeType: mimeType,
        body: bufferStream,
      };

      const requestBody = {
        name: fileName,
        parents: [folderId],
      };

      console.log(`Uploading file: ${fileName} to folder: ${folderId}`);
      
      const response = await this.drive.files.create({
        requestBody,
        media: media,
        fields: 'id,name,size,mimeType',
      });

      console.log(`File uploaded successfully. File ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async getFileStream(fileId) {
    try {
      console.log(`Getting file stream for ID: ${fileId}`);
      
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });

      return response;
    } catch (error) {
      console.error('Error getting file stream:', error);
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
      console.log(`File deleted successfully: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getFileMetadata(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,size,mimeType,createdTime,modifiedTime'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  // Method untuk memeriksa akses ke folder
  async checkFolderAccess(folderId) {
    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id,name,parents'
      });
      console.log(`Folder access confirmed: ${response.data.name}`);
      return response.data;
    } catch (error) {
      console.error('Error accessing folder:', error);
      throw new Error(`Folder access failed: ${error.message}`);
    }
  }
}

module.exports = new GoogleDriveService();