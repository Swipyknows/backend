import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apierror.js";
import { Response } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { cosineSimilarity } from "../utils/embedding.service.js";

/**
 * Gets personalized video recommendations for the authenticated user.
 * Uses a hybrid scoring model: 60% Semantic Similarity + 25% Recency + 15% Popularity.
 */
const getPersonalizedRecommendations = asynchandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const hasInterestVector = Array.isArray(user.interestVector) && user.interestVector.length > 0;
    const watchedVideoIds = (user.watchhistory || []).map((id) => id.toString());

    // Fetch candidate videos (published videos)
    const candidateVideos = await Video.find({ ispublisher: true })
        .populate("owner", "username fullname avatar")
        .lean();

    if (candidateVideos.length === 0) {
        return res.status(200).json(new Response(true, { videos: [], page, total: 0 }, "No videos available"));
    }

    // Calculate max views and newest timestamp for normalization
    let maxViews = 1;
    const now = Date.now();

    candidateVideos.forEach((vid) => {
        if (vid.views > maxViews) maxViews = vid.views;
    });

    const scoredVideos = candidateVideos.map((video) => {
        let similarityScore = 0;

        if (hasInterestVector && Array.isArray(video.descriptionVector) && video.descriptionVector.length > 0) {
            similarityScore = cosineSimilarity(user.interestVector, video.descriptionVector);
            // Ensure similarity score is non-negative
            similarityScore = Math.max(0, similarityScore);
        }

        // Recency score (decay over 30 days)
        const ageInDays = (now - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.exp(-ageInDays / 30);

        // Popularity score (views ratio)
        const popularityScore = Math.min(1, (video.views || 0) / maxViews);

        // Penalize recently watched videos slightly to promote fresh discovery
        const watchedPenalty = watchedVideoIds.includes(video._id.toString()) ? 0.3 : 1.0;

        // Final Hybrid Score Formula
        let hybridScore = 0;
        if (hasInterestVector) {
            hybridScore = (0.60 * similarityScore + 0.25 * recencyScore + 0.15 * popularityScore) * watchedPenalty;
        } else {
            // Cold start fallback: 65% recency + 35% popularity
            hybridScore = (0.65 * recencyScore + 0.35 * popularityScore) * watchedPenalty;
        }

        return {
            ...video,
            recommendationScore: parseFloat(hybridScore.toFixed(4)),
            similarityScore: parseFloat(similarityScore.toFixed(4))
        };
    });

    // Sort by hybrid recommendation score descending
    scoredVideos.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Pagination slice
    const startIndex = (page - 1) * limit;
    const paginatedVideos = scoredVideos.slice(startIndex, startIndex + limit);

    return res.status(200).json(
        new Response(
            true,
            {
                videos: paginatedVideos,
                page,
                limit,
                total: scoredVideos.length,
                totalPages: Math.ceil(scoredVideos.length / limit),
                hasInterestProfile: hasInterestVector
            },
            "Personalized recommendations retrieved successfully"
        )
    );
});

/**
 * Gets similar videos for a specific target video ("Up Next" / "Related Videos").
 */
const getSimilarVideos = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    const targetVideo = await Video.findById(videoId);
    if (!targetVideo) {
        throw new ApiError(404, "Target video not found");
    }

    const hasTargetVector = Array.isArray(targetVideo.descriptionVector) && targetVideo.descriptionVector.length > 0;

    // Fetch candidate videos excluding the target video itself
    const candidates = await Video.find({
        _id: { $ne: videoId },
        ispublisher: true
    })
        .populate("owner", "username fullname avatar")
        .lean();

    const scoredCandidates = candidates.map((video) => {
        let similarity = 0;
        if (hasTargetVector && Array.isArray(video.descriptionVector) && video.descriptionVector.length > 0) {
            similarity = cosineSimilarity(targetVideo.descriptionVector, video.descriptionVector);
            similarity = Math.max(0, similarity);
        }

        return {
            ...video,
            similarityScore: parseFloat(similarity.toFixed(4))
        };
    });

    if (hasTargetVector) {
        scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);
    } else {
        // Fallback: sort by views if target video has no vector yet
        scoredCandidates.sort((a, b) => (b.views || 0) - (a.views || 0));
    }

    const topSimilar = scoredCandidates.slice(0, limit);

    return res.status(200).json(
        new Response(true, topSimilar, "Similar videos retrieved successfully")
    );
});

export {
    getPersonalizedRecommendations,
    getSimilarVideos
};
