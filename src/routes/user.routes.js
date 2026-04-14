import {Router} from "express"
import {registerUser} from "../controllers/user.controller.js"
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
export default router;