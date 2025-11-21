import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiRError.js'
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";



const registerUser = asyncHandler( async (req, res) => {

    const { fullName, email, username, password } = req.body

    if(
        [fullName, email, username, password]
        .some((field) => field?.trim() === "")
    ){
        // if this runs means: some unit is missing
        throw new ApiError(4000, "All fields are required")
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existingUser) throw new ApiError(409, "User with same username or Email Already Exists")


    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is required")
        console.log(avatarLocalPath)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log(avatar)

    if(!avatar) throw new ApiError(400, "Avatar is required")
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Some Thing went wrong")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registred successfully")
    )
})

    
    


export {
    registerUser,

}