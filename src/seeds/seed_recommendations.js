import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import connectDB from "../db/dbi.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import {
    generateEmbedding,
    aggregateUserInterestVector,
    cosineSimilarity
} from "../utils/embedding.service.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadVideoToCloudinary(remoteUrl, publicId) {
    try {
        try {
            const existing = await cloudinary.api.resource(`videotube_seed/${publicId}`, { resource_type: "video" });
            console.log(`      Reusing existing Cloudinary clip: ${publicId}`);
            return { url: existing.secure_url, duration: Math.round(existing.duration || 10) };
        } catch (_) {}
        console.log(`      Uploading to Cloudinary: ${publicId} ...`);
        const result = await cloudinary.uploader.upload(remoteUrl, {
            resource_type: "video", public_id: publicId, folder: "videotube_seed", overwrite: false
        });
        console.log(`      Done: ${result.secure_url}`);
        return { url: result.secure_url, duration: Math.round(result.duration || 10) };
    } catch (err) {
        console.error(`      Cloudinary upload failed for ${publicId}: ${err.message}`);
        return null;
    }
}

const SOURCE_VIDEOS = [
    "https://download.samplelib.com/mp4/sample-5s.mp4",    // V0 ~600KB
    "https://download.samplelib.com/mp4/sample-10s.mp4",   // V1 ~1.2MB
    "https://download.samplelib.com/mp4/sample-30s.mp4",   // V2 ~3.6MB (replacing 403 URL)
    "https://download.samplelib.com/mp4/sample-15s.mp4",   // V3 ~1.8MB
    "https://download.samplelib.com/mp4/sample-20s.mp4",   // V4 ~2.4MB (replacing 403 URL)
    "https://download.samplelib.com/mp4/sample-5s.mp4",    // V5 ~600KB (reuse)
];

const RAW_VIDEOS = [
    { key: "tech_1", category: "Tech", srcIdx: 0, views: 12500, daysAgo: 3,
      title: "Full-Stack Node.js and Express REST API Masterclass",
      description: "Build production-ready RESTful APIs with Node.js, Express, MongoDB, and JWT authentication. Error handling, middleware, and clean architecture patterns.",
      tags: ["nodejs","express","backend","javascript","api","mongodb","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640&q=80" },
    { key: "tech_2", category: "Tech", srcIdx: 1, views: 8900, daysAgo: 5,
      title: "React 19 Deep Dive: Server Components and State Management",
      description: "Master React 19 features including useActionState, optimistic updates, Server Actions, and modern client-side performance tuning.",
      tags: ["react","frontend","javascript","webdev","ui","hooks","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=640&q=80" },
    { key: "tech_3", category: "Tech", srcIdx: 2, views: 15400, daysAgo: 10,
      title: "Docker and Kubernetes Crash Course for Developers",
      description: "Containerization with Docker multi-stage builds, Docker Compose, and deploying resilient microservices on Kubernetes clusters in production.",
      tags: ["docker","devops","kubernetes","containers","cloud","microservices","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=640&q=80" },
    { key: "tech_4", category: "Tech", srcIdx: 3, views: 28000, daysAgo: 14,
      title: "System Design: Scaling Web Apps to 10 Million Users",
      description: "Architecture breakdown of database sharding, Redis caching, Kafka message queues, horizontal scaling, CDN strategies, and load balancing.",
      tags: ["systemdesign","architecture","redis","scalability","backend","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&q=80" },
    { key: "tech_5", category: "Tech", srcIdx: 4, views: 19200, daysAgo: 2,
      title: "Building Autonomous AI Agents with Python and LangChain",
      description: "Build intelligent LLM agents with Python, tool calling, memory management, and Retrieval Augmented Generation RAG using LangChain framework.",
      tags: ["ai","python","langchain","machinelearning","llm","rag","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80" },
    { key: "cook_1", category: "Cooking", srcIdx: 5, views: 31000, daysAgo: 4,
      title: "Authentic Italian Carbonara: The Traditional Roman Recipe",
      description: "Make authentic Roman pasta carbonara with crispy guanciale, pecorino romano, egg yolks, and fresh black pepper. No cream, no shortcuts.",
      tags: ["cooking","pasta","carbonara","italian","food","recipe","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1621996346565-e3d5d6281729?w=640&q=80" },
    { key: "cook_2", category: "Cooking", srcIdx: 0, views: 14200, daysAgo: 8,
      title: "Artisan Sourdough Bread from Scratch for Beginners",
      description: "Master baking sourdough bread at home with wild yeast starter, bulk fermentation, stretch and folds, shaping, and Dutch oven baking technique.",
      tags: ["baking","sourdough","bread","cooking","homemade","fermentation","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&q=80" },
    { key: "cook_3", category: "Cooking", srcIdx: 1, views: 9400, daysAgo: 1,
      title: "Quick 15-Minute Healthy Meal Prep for Busy Weekdays",
      description: "Easy healthy lunch box meal prep with lean protein, roasted vegetables, whole grains, and macro-friendly homemade dressings for the week.",
      tags: ["mealprep","healthy","recipes","quickmeals","food","nutrition","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1547592180-85f173990554?w=640&q=80" },
    { key: "fit_1", category: "Fitness", srcIdx: 2, views: 24500, daysAgo: 2,
      title: "Push Day Workout for Hypertrophy: Chest and Shoulders",
      description: "Science-based push workout for muscle growth. Barbell bench press, incline dumbbell press, cable lateral raises, and overhead tricep extensions.",
      tags: ["workout","hypertrophy","chest","pushday","gym","fitness","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=640&q=80" },
    { key: "fit_2", category: "Fitness", srcIdx: 3, views: 18300, daysAgo: 6,
      title: "Pull Day Essentials: Building a Thick V-Taper Back",
      description: "Maximize lat and upper back hypertrophy with weighted pull-ups, chest-supported rows, face pulls, rear delt flies, and incline bicep curls.",
      tags: ["pullday","backworkout","biceps","gym","fitness","lats","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640&q=80" },
    { key: "fit_3", category: "Fitness", srcIdx: 4, views: 16700, daysAgo: 9,
      title: "High-Protein Diet and Macro Tracking for Lean Muscle",
      description: "Calculate your daily caloric maintenance, optimal protein intake, and plan whole-food meals for lean muscle growth without unwanted fat gain.",
      tags: ["nutrition","macros","fatloss","diet","protein","musclegain","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=640&q=80" },
    { key: "game_1", category: "Gaming", srcIdx: 5, views: 39000, daysAgo: 3,
      title: "Elden Ring: Top 10 Overpowered Builds for Beginners",
      description: "Guide to early-game weapons, talismans, and stat distributions to conquer difficult bosses in the Lands Between open world rpg.",
      tags: ["eldenring","gaming","rpg","souls","walkthrough","builds","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=640&q=80" },
    { key: "game_2", category: "Gaming", srcIdx: 1, views: 21500, daysAgo: 7,
      title: "Tactical FPS Aim Guide: Crosshair Placement and Mechanics",
      description: "Mechanical aim improvement routines, angle clearing fundamentals, counter-strafing, spray control, and warmup routines for competitive fps games.",
      tags: ["fps","aimguide","esports","gaming","pcgaming","competitive","seed-data"],
      thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80" },
];

const PERSONAS = [
    { username: "coder_dan", email: "dan@test.com", fullname: "Dan The Coder",
      taste: "Tech / Web Development", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=coderdan",
      watchedKeys: ["tech_1","tech_2","tech_4"], likedKeys: ["tech_1","tech_3"] },
    { username: "chef_chloe", email: "chloe@test.com", fullname: "Chloe The Chef",
      taste: "Cooking / Food Recipes", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chefchloe",
      watchedKeys: ["cook_1","cook_2"], likedKeys: ["cook_1","cook_3"] },
    { username: "fitness_felix", email: "felix@test.com", fullname: "Felix The Athlete",
      taste: "Fitness / Bodybuilding", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=fitnessfelix",
      watchedKeys: ["fit_1","fit_2","fit_3"], likedKeys: ["fit_1","fit_3"] },
    { username: "gamer_glen", email: "glen@test.com", fullname: "Glen The Gamer",
      taste: "Gaming / Guides", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=gamerglen",
      watchedKeys: ["game_1","game_2"], likedKeys: ["game_1"] },
    { username: "hybrid_harper", email: "harper@test.com", fullname: "Harper Hybrid",
      taste: "Hybrid: Tech + Fitness", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hybridharper",
      watchedKeys: ["tech_1","fit_1","tech_5"], likedKeys: ["tech_1","fit_2"] },
    { username: "cold_start_cathy", email: "cathy@test.com", fullname: "Cathy Cold Start",
      taste: "New User (Zero History)", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cathy",
      watchedKeys: [], likedKeys: [] },
];

const TEST_PASSWORD = "Password@123";

async function runSeed() {
    console.log("\n================================================================================");
    console.log("   RECOMMENDATION SEEDER v2 -- Cloudinary-hosted videos (CORS-free)");
    console.log("================================================================================\n");

    await connectDB();

    console.log("Step 1: Cleaning previous seed data...");
    const oldUsers = await User.find({ email: { $regex: /@test\.com$/i } }).select("_id");
    await Like.deleteMany({ likedBy: { $in: oldUsers.map(u => u._id) } });
    const du = await User.deleteMany({ email: { $regex: /@test\.com$/i } });
    const dv = await Video.deleteMany({ tags: "seed-data" });
    console.log(`   Removed ${du.deletedCount} users and ${dv.deletedCount} videos.\n`);

    console.log("Step 2: Creating creator accounts...");
    const categoryCreatorMap = {};
    for (const [cat, username, email, fullname] of [
        ["Tech",    "tech_academy",   "tech_creator@test.com",  "Tech Academy"],
        ["Cooking", "gourmet_studio", "food_creator@test.com",  "Gourmet Studio"],
        ["Fitness", "iron_athletics", "gym_creator@test.com",   "Iron Athletics"],
        ["Gaming",  "pixel_forge",    "game_creator@test.com",  "Pixel Forge Gaming"],
    ]) {
        const u = new User({ username, email, fullname, password: TEST_PASSWORD,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
            coverimage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80"
        });
        await u.save();
        categoryCreatorMap[cat] = u._id;
    }
    console.log("   Created 4 creator accounts.\n");

    console.log("Step 3: Uploading source clips to Cloudinary...");
    console.log("   (Clips serve from res.cloudinary.com -- no CORS issues in browser)\n");
    const clipUrls = {};
    const clipDurations = {};
    for (let i = 0; i < SOURCE_VIDEOS.length; i++) {
        process.stdout.write(`   Clip [${i}/${SOURCE_VIDEOS.length - 1}]: `);
        const result = await uploadVideoToCloudinary(SOURCE_VIDEOS[i], `seed_clip_${i}`);
        clipUrls[i] = result ? result.url : SOURCE_VIDEOS[i];
        clipDurations[i] = result ? result.duration : 10;
    }

    console.log(`\nStep 4: Embedding and inserting ${RAW_VIDEOS.length} videos...\n`);
    const videoDbMap = {};
    const createdVideos = [];

    for (let i = 0; i < RAW_VIDEOS.length; i++) {
        const raw = RAW_VIDEOS[i];
        process.stdout.write(`   [${String(i+1).padStart(2)}/${RAW_VIDEOS.length}] "${raw.title.substring(0, 48)}" `);
        const vector = await generateEmbedding(`${raw.title} ${raw.description} ${raw.tags.join(" ")}`);
        const createdAt = new Date(Date.now() - raw.daysAgo * 24 * 60 * 60 * 1000);
        const video = new Video({
            title: raw.title, description: raw.description,
            videofile: clipUrls[raw.srcIdx],
            thumbnail: raw.thumbnail,
            duration: clipDurations[raw.srcIdx] || 30,
            views: raw.views, ispublisher: true,
            owner: categoryCreatorMap[raw.category],
            descriptionVector: vector, tags: raw.tags, createdAt
        });
        await video.save();
        videoDbMap[raw.key] = video;
        createdVideos.push({ ...raw, _id: video._id, descriptionVector: vector, createdAt });
        console.log(`-- OK (${vector.length}-d)`);
    }
    console.log(`\n   ${createdVideos.length} videos inserted.\n`);

    console.log("Step 5: Creating persona users with interest vectors...\n");
    const createdPersonas = [];
    for (const persona of PERSONAS) {
        const user = new User({
            username: persona.username, email: persona.email, fullname: persona.fullname,
            password: TEST_PASSWORD, avatar: persona.avatar,
            coverimage: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1280&q=80"
        });
        const watchedDocs = persona.watchedKeys.map(k => videoDbMap[k]).filter(Boolean);
        const likedDocs   = persona.likedKeys.map(k => videoDbMap[k]).filter(Boolean);
        user.watchhistory = watchedDocs.map(v => v._id);
        await user.save();
        for (const vid of likedDocs) await Like.create({ likedBy: user._id, video: vid._id });
        const allVectors = [...watchedDocs, ...likedDocs].map(v => v.descriptionVector);
        if (allVectors.length > 0) {
            user.interestVector = aggregateUserInterestVector(allVectors);
            user.lastVectorUpdate = new Date();
            await user.save();
            console.log(`   [${persona.username.padEnd(20)}] "${persona.taste}" -- ${user.interestVector.length}-d vector built.`);
        } else {
            console.log(`   [${persona.username.padEnd(20)}] Cold start -- no vector.`);
        }
        createdPersonas.push({ persona, user });
    }

    console.log("\n================================================================================");
    console.log("   RECOMMENDATION ENGINE VERIFICATION (top 3 recommended per persona)");
    console.log("================================================================================");
    const maxViews = createdVideos.reduce((m, v) => Math.max(m, v.views), 1);
    const now = Date.now();
    for (const { persona, user } of createdPersonas) {
        const hasIV  = Array.isArray(user.interestVector) && user.interestVector.length > 0;
        const watched = (user.watchhistory || []).map(id => id.toString());
        const scored = createdVideos.map(v => {
            const sim  = hasIV && v.descriptionVector?.length ? Math.max(0, cosineSimilarity(user.interestVector, v.descriptionVector)) : 0;
            const age  = (now - new Date(v.createdAt).getTime()) / 86400000;
            const score = hasIV
                ? (0.60 * sim + 0.25 * Math.exp(-age / 30) + 0.15 * Math.min(1, v.views / maxViews)) * (watched.includes(v._id.toString()) ? 0.3 : 1.0)
                : (0.65 * Math.exp(-age / 30) + 0.35 * Math.min(1, v.views / maxViews)) * (watched.includes(v._id.toString()) ? 0.3 : 1.0);
            return { title: v.title, cat: v.category, sim: sim.toFixed(3), score: score.toFixed(4), w: watched.includes(v._id.toString()) };
        }).sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).slice(0, 3);
        console.log(`\n  ${persona.username} ("${persona.taste}")`);
        scored.forEach((r, i) => console.log(`    ${i+1}. [${r.cat}] ${r.title.substring(0,52)} | Score:${r.score} Sim:${r.sim}${r.w?" [watched pen]":""}`));
    }

    console.log("\n================================================================================");
    console.log("   TEST ACCOUNTS  |  Password: Password@123");
    console.log("================================================================================");
    PERSONAS.forEach(p => console.log(`   ${p.username.padEnd(20)} ${p.email.padEnd(22)} ${p.taste}`));
    console.log("\n   Done! Videos are on YOUR Cloudinary and will play in the browser.");
    console.log("================================================================================\n");

    process.exit(0);
}

runSeed().catch(err => {
    console.error("\nSeeding failed:", err.message || err);
    process.exit(1);
});
