import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { upload } from "../middlewares/upload";

export const uploadsRouter = Router();

const uploadSingle = upload.single("file");

function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadSingle(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "File too large" });
      }
      return res.status(400).json({ message: err.message });
    }

    const message = err instanceof Error ? err.message : "Invalid file";
    return res.status(400).json({ message });
  });
}

// POST /uploads (multipart/form-data: file)
uploadsRouter.post("/uploads", handleUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "file is required" });
  }

  const filename = req.file.filename;
  const url = `/uploads/${filename}`;

  return res.json({ url });
});
