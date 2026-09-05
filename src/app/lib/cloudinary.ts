import { v2 as cloudinary } from "cloudinary";
import config from "../config";
import { AppError } from "../utils/AppError";
import httpStatus from "http-status";

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

export interface IUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
}

export const uploadToCloudinary = async (
  file: IUploadFile,
  folder = "fieldops/avatars",
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new AppError(
              httpStatus.BAD_GATEWAY,
              `Cloudinary upload failed: ${error?.message || "Unknown error"}`,
            ),
          );
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    uploadStream.end(file.buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete asset from Cloudinary:", error);
  }
};

export default cloudinary;
