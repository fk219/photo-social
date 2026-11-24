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
      setError("Choose a JPEG, PNG, or WebP photograph.");
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
        err?.message || "This photograph could not be prepared for upload."
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
          ? "The photograph is still being optimized."
          : "Choose a photograph before publishing this frame."
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
          "This frame could not be published. Please try again."
        )
      );
      setPublishing(false);
    }
  };

  const hasPreview = Boolean(preview) && !previewFailed;

  return (
    <main className="create-page" id="main-content">
      <div className="create-shell">
        <header className="create-header">
          <p className="eyebrow">Create / New frame</p>
          <h1>
            Post the frame. Write the <em>take.</em>
          </h1>
          <p>
            One photograph and a short take. The take becomes the headline of
            the thread, so write the thought you want people to answer.
          </p>
        </header>

        <form className="studio-card" onSubmit={handleSubmit} noValidate>
          <div className="studio-media">
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
                  ? "Change the selected photograph"
                  : "Choose a photograph"
              }
              aria-busy={compressing}
            >
              {hasPreview ? (
                <>
                  <img
                    src={preview}
                    alt="Selected photograph preview"
                    className="dropzone-preview"
                    onError={() => setPreviewFailed(true)}
                  />
                  <span className="dropzone-change">
                    {compressing ? "Optimizing..." : "Change photograph"}
                  </span>
                </>
              ) : (
                <div className="dropzone-empty">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="14" rx="1.5" />
                    <circle cx="12" cy="13" r="3.2" />
                    <path d="m8 6 1.4-2h5.2L16 6" />
                  </svg>
                  <strong>
                    {previewFailed ? "Preview unavailable" : "Add a photograph"}
                  </strong>
                  <span>Drop a file here or click to browse</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="frame-image"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                hidden
                onChange={handleFileChange}
              />
            </div>

            <p className="studio-file-note">
              JPEG, PNG, or WebP. Photographs are resized to 1600 px and
              compressed in your browser before upload.
            </p>
          </div>

          <div className="studio-fields">
            <div className="studio-fields-head">
              <p className="eyebrow">Your take</p>
              <h2>What should we see?</h2>
              <p>
                A sentence or two is enough. People reply to a point of view,
                not to a caption.
              </p>
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="frame-caption">The take</label>
                <span className="field-hint">{caption.length} / 2200</span>
              </div>
              <textarea
                id="frame-caption"
                name="caption"
                maxLength={2200}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="What were you after in this frame?"
                aria-describedby="frame-caption-hint"
              />
              <p className="field-hint" id="frame-caption-hint">
                Optional. A frame can stand alone, though a take starts more
                conversations.
              </p>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="studio-actions">
              <p className="studio-note">
                {compressing
                  ? "Optimizing the photograph..."
                  : "One photograph per frame."}
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
                  "Publish frame"
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
