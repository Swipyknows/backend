import {Router} from "express"
import {registerUser,loginuser,logoutUser,refreshAccessToken, updateProfile, getcurrentuser, getUserWatchHistory, userchannelprofile, updateUserCoverimage, updateUserAvatar, changePassword} from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router=Router();

router.route("/test").get((req, res) => {
    res.json({ message: "Test route working!" });
});

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    (err, req, res, next) => {
        if (err) {
            console.log("MULTER ERROR:", err);
            return res.status(400).json({ error: err.message });
        }
        next();
    },
    registerUser);
router.route("/login").post(loginuser);
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh_token").post(refreshAccessToken);
router.route("/change_password").post(verifyJWT,changePassword);
router.route("/update_avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update_coverimage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverimage);
router.route("/c/:username").get(verifyJWT,
userchannelprofile);
router.route("/watch_history").get(verifyJWT,getUserWatchHistory);
router.route("/current_user").get(verifyJWT,getcurrentuser);
router.route("/update_user").patch(verifyJWT,updateProfile);
export default router;

// import { Router } from "express";
// import { 
//     loginUser, 
//     logoutUser, 
//     registerUser, 
//     refreshAccessToken, 
//     changeCurrentPassword, 
//     getCurrentUser, 
//     updateUserAvatar, 
//     updateUserCoverImage, 
//     getUserChannelProfile, 
//     getWatchHistory, 
//     updateAccountDetails
// } from "../controllers/user.controller.js";
// import {upload} from "../middlewares/multer.middleware.js"
// import { verifyJWT } from "../middlewares/auth.middleware.js";


// const router = Router()

// router.route("/register").post(
//     upload.fields([
//         {
//             name: "avatar",
//             maxCount: 1
//         }, 
//         {
//             name: "coverImage",
//             maxCount: 1
//         }
//     ]),
//     registerUser
//     )

// router.route("/login").post(loginUser)

// //secured routes
// router.route("/logout").post(verifyJWT,  logoutUser)
// router.route("/refresh-token").post(refreshAccessToken)
// router.route("/change-password").post(verifyJWT, changeCurrentPassword)
// router.route("/current-user").get(verifyJWT, getCurrentUser)
// router.route("/update-account").patch(verifyJWT, updateAccountDetails)

// router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
// router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

// router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
// router.route("/history").get(verifyJWT, getWatchHistory)

// export default router