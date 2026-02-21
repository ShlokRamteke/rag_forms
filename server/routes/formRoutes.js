import express from "express";
import formController from "../controllers/formController.js";
import uploadController from "../controllers/uploadController.js";
import multer from "multer";
import requireAdmin from "../middleware/adminAuth.js";

const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.get("/forms", requireAdmin, formController.getAllForms);
router.post("/forms", requireAdmin, formController.createForm);
router.get("/forms/:id", formController.getFormById);
router.post("/analyze", requireAdmin, formController.analyzeForm);

// Canonical endpoints
router.post("/forms/:id/submit", formController.submitResponse);
router.post("/forms/:id/upload", requireAdmin, upload.single("file"), uploadController.uploadData);

// Backward-compat (older clients)
router.post("/:id/submit", formController.submitResponse);
router.post("/:id/upload", requireAdmin, upload.single("file"), uploadController.uploadData);

export default router;
