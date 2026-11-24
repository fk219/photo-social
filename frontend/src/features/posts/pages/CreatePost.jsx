import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePost } from "../hooks/usePost.js";
import { getErrorMessage } from "../../shared/utils/error";
import {
  ACCEPTED_IMAGE_TYPES,
  ALLOWED_IMAGE_TYPES,
  compressImage,
} from "../../shared/utils/image";

import "../style/createPost.scss";

const CreatePost = () => {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const compressionRef = useRef(0);
  const { handleCreatePost } = usePost();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const chooseFile = () => {
    fileInputRef.current?.click();
  };

  const acceptFile = async (candidate) => {
    setError("");

    if (!candidate) return;

    if (!ALLOWED_IMAGE_TYPES.has(candidate.type)) {
      compressionRef.current += 1;
      setCompressing(false);
      setFile(null);
      setPreview(null);
      setError("Choose a JPEG, PNG, or WebP photo.");
      return;
    }

    const requestId = compressionRef.current + 1;
    compressionRef.current = requestId;

    setPreviewFailed(false);
    setFile(null);
    setPreview(URL.createObjectURL(candidate));
    setCompressing(true);

    try {
      const compressed = await compressImage(candidate);

      if (compressionRef.current !== requestId) return;

      setFile(compressed);
    } catch (err) {
      if (compressionRef.current !== requestId) return;

      setError(
        err?.message || "This photo could not be prepared for upload."
      );
    } finally {
      if (compressionRef.current === requestId) {
        setCompressing(false);
      }
    }
  };

  const handleFileChange = (event) => {
    const [selected] = event.target.files ?? [];
    event.target.value = "";
    acceptFile(selected);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseFile();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!file) {
      setError(
        compressing
          ? "The photo is still being optimized."
          : "Choose a photo before sharing this post."
      );
      return;
    }

    setPublishing(true);

    try {
      await handleCreatePost(file, caption);
      navigate("/");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "This post could not be published. Please try again."
        )
      );
      setPublishing(false);
    }
  };

  const hasPreview = Boolean(preview) && !previewFailed;

  return (
    <main className="create-page" id="main-content">
      <div className="page-shell page-shell--create">
        <header className="create-header">
          <h1>New post</h1>
          <p>Choose a photo and add a caption if you want one.</p>
        </header>

        <form className="create-card" onSubmit={handleSubmit} noValidate>
          <div className="create-media">
            <div
              className={`dropzone${hasPreview ? " has-preview" : ""}${
                dragging ? " is-dragging" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={chooseFile}
              onKeyDown={handleKeyDown}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              aria-label={
                hasPreview
                  ? "Change the selected photo"
                  : "Choose a photo"
              }
              aria-busy={compressing}
            >
              {hasPreview ? (
                <>
                  <img
                    src={preview}
                    alt="Selected photo preview"
                    className="dropzone-preview"
                    onError={() => setPreviewFailed(true)}
                  />
                  <span className="dropzone-change">
                    {compressing ? "Optimizing..." : "Change photo"}
                  </span>
                </>
              ) : (
                <div className="dropzone-empty">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="14" rx="2" />
                    <circle cx="12" cy="13" r="3.2" />
                    <path d="m8 6 1.4-2h5.2L16 6" />
                  </svg>
                  <strong>
                    {previewFailed ? "Preview unavailable" : "Add a photo"}
                  </strong>
                  <span>Drag a file here or click to browse</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="post-image"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                hidden
                onChange={handleFileChange}
              />
            </div>

            <p className="create-file-note">
              JPEG, PNG, or WebP. Photos are resized to 1600 px and compressed
              in your browser before upload.
            </p>
          </div>

          <div className="create-fields">
            <div className="field">
              <div className="field-label-row">
                <label htmlFor="post-caption">Caption</label>
                <span className="field-hint">{caption.length} / 2200</span>
              </div>
              <textarea
                id="post-caption"
                name="caption"
                maxLength={2200}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Write a caption..."
                aria-describedby="post-caption-hint"
              />
              <p className="field-hint" id="post-caption-hint">
                Optional. Use @mentions and #hashtags to help people find it.
              </p>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="create-actions">
              <p className="create-note">
                {compressing
                  ? "Optimizing the photo..."
                  : "One photo per post."}
              </p>
              <button
                type="submit"
                className={`button primary-button${
                  publishing || compressing ? " is-loading" : ""
                }`}
                disabled={!file || publishing || compressing}
                aria-busy={publishing || compressing}
              >
                {publishing ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Publishing...
                  </>
                ) : compressing ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Optimizing...
                  </>
                ) : (
                  "Share post"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
};

export default CreatePost;
