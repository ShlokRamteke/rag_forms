import express from "express";
import formController from "../controllers/formController.js";
import uploadController from "../controllers/uploadController.js";
import multer from "multer";
import requireAdmin from "../middleware/adminAuth.js";
import validateId from "../middleware/validateId.js";

import rateLimit from "express-rate-limit";

const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = ["text/csv", "application/json"];
        cb(null, allowed.includes(file.mimetype));
    },
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => {
        return req?.auth?.userId || req.ip;
    },
    message: { error: "Too many uploads created from this user, please try again after 15 minutes" }
});

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => {
        return req?.auth?.userId || req.ip;
    },
    message: { error: "Too many chat messages from this user, please try again after a minute" }
});

const submitLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // 30 submissions per 10 mins per IP
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => req.ip,
    message: { error: "Too many form submissions from this IP address. Please try again later." }
});

const publicFormLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120, // 120 queries per minute per IP
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => req.ip,
    message: { error: "Too many requests. Please slow down." }
});

const router = express.Router();

router.get("/forms", requireAdmin, formController.getAllForms);
router.post("/forms", requireAdmin, formController.createForm);
router.get("/drafts", requireAdmin, formController.getAllDrafts);
router.get("/drafts/create-form", requireAdmin, formController.getCreateFormDraft);
router.put("/drafts/create-form", requireAdmin, formController.saveCreateFormDraft);
router.delete("/drafts/create-form", requireAdmin, formController.deleteCreateFormDraft);
router.get("/drafts/:draftKey", requireAdmin, formController.getDraftByKey);
router.put("/drafts/:draftKey", requireAdmin, formController.saveDraftByKey);
router.delete("/drafts/:draftKey", requireAdmin, formController.deleteDraftByKey);
router.get("/forms/:id", publicFormLimiter, validateId, formController.getPublicFormById);
router.get("/forms/:id/admin", requireAdmin, validateId, formController.getAdminFormById);
router.put("/forms/:id", requireAdmin, validateId, formController.updateForm);
router.get("/forms/:id/conversations", requireAdmin, validateId, formController.getConversationHistory);
router.delete("/forms/:id/conversations", requireAdmin, validateId, formController.clearConversationHistory);
router.get("/forms/:id/responses", requireAdmin, validateId, formController.getFormResponses);
router.post("/analyze", requireAdmin, chatLimiter, formController.analyzeForm);
router.post("/analyze/stream", requireAdmin, chatLimiter, formController.analyzeFormStream);
router.delete("/forms/:id", requireAdmin, validateId, formController.deleteForm);

// Cleanup endpoint scoped to admin owner
router.post("/admin/clear-legacy-data", requireAdmin, formController.clearLegacyData);

// Canonical endpoints
router.post("/forms/:id/submit", submitLimiter, validateId, formController.submitResponse);
router.post("/forms/:id/upload", requireAdmin, uploadLimiter, validateId, upload.single("file"), uploadController.uploadData);

export default router;
