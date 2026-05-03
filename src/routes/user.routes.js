import {Router} from "express"
import {registerUser,loginuser,logoutUser,refreshAccessToken, updateProfile, getcurrentuser, getUserWatchHistory, userchannelprofile, updateUserCoverimage, updateUserAvatar, changePassword} from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {upload} from "../middlewares/multer.middleware.js"

const router=Router();

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
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changePassword);
router.route("/update-avatar").post(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-coverimage").post(verifyJWT,upload.single("coverImage"),updateUserCoverimage);
router.route("/c/:username").get(verifyJWT,
userchannelprofile);
router.route("/watch-history").get(verifyJWT,getUserWatchHistory);
router.route("/current-user").get(verifyJWT,getcurrentuser);
router.route("/update-user").put(verifyJWT,updateProfile);
export default router;