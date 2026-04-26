import {Router} from "express"
import {registerUser,loginuser,logoutUser,refreshAccessToken} from "../controllers/user.controller.js"
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

export default router;