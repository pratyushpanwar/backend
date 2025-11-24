import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiRError.js'
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";



const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken
         = refreshToken;
        user.save({ validateBeforeSave: false })

        return { refreshToken, accessToken }

        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

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

    if(existingUser) {throw new ApiError(409, "User with same username or Email Already Exists")}


    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is required")
        console.log(avatarLocalPath)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // console.log(avatar)

    if(!avatar) throw new ApiError(400, "Avatar is required")
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Some Thing went wrong")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registred successfully")
    )
})

const loginUser = asyncHandler( async(req, res) => {
    const { email, username, password } = req.body

    if(!email && !username) {
        throw new ApiError(400, "email password is required")
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if(!user) throw new ApiError(404, "user does not exist");

    const isCorrect = await user.isPasswordCorrect(password);

    if(!isCorrect) throw new ApiError(400, "password is incorrect");

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id)

    const logginedUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie(refreshToken, "refreshToken", options)
    .cookie(accessToken, "accessToken", options)
    .json(
        new ApiResponse(200,
            {
                user: logginedUser, refreshToken, accessToken
            },
            "User logged In Successfully"
        )
    )
    
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})
    
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken 
}