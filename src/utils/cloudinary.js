import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});




const uploadOnCloudinary = async (localFilePath) => {
  try {
    if(!localFilePath) return null
    // upload file on cloudnary
    console.log("before")
    console.log(localFilePath)
    
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    })
    console.log("after")
    
    // file uploaded on cloudnary
    console.log("file uploaded on cloudnary", response.url);
    return response;

  } catch (error) {
    console.log("Cloudinary Error:", error);

    fs.unlinkSync(localFilePath) 
    return null;
  }
}


export {uploadOnCloudinary}