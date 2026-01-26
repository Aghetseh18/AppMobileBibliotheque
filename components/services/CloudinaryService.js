import { Alert } from 'react-native';

const CLOUD_NAME = "dqbjubqxq";
const UPLOAD_PRESET = "ml_default"; // USER MUST UPDATE THIS!

export const uploadToCloudinary = async (uri) => {
    if (!uri) return null;

    try {
        const data = new FormData();
        data.append('file', {
            uri: uri,
            type: 'image/jpeg',
            name: 'upload.jpg',
        });
        data.append('upload_preset', UPLOAD_PRESET);
        data.append('cloud_name', CLOUD_NAME);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'post',
            body: data,
        });

        const result = await response.json();

        if (result.secure_url) {
            return result.secure_url;
        } else {
            console.error("Cloudinary upload failed:", result);
            throw new Error(result.error?.message || "Upload failed");
        }
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        Alert.alert("Upload Error", "Failed to upload image. Please check your internet connection.");
        return null;
    }
};
