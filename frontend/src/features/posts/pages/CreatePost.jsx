import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePost } from "../hooks/usePost.js";
import { getErrorMessage } from "../../shared/utils/error";

import "../style/createPost.scss";

const CreatePost = () => {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const { loading, handleCreatePost } = usePost();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const chooseFile = () => {
    fileInputRef.current?.click();
  };

  const acceptFile = (candidate) => {
    setError("");

    if (!candidate) return;

    if (!candidate.type?.startsWith("image/")) {
      setError("Choose an image file for this frame.");
      return;
    }

    setPreviewFailed(false);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  };

  const handleFileChange = (event) => {
    const [selected] = event.target.files ?? [];
    acceptFile(selected);
    event.target.value = "";
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
      setError("Choose a photograph before adding this frame.");
      return;
    }

    try {
      await handleCreatePost(file, caption);
      navigate("/");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "This frame could not be added. Please try again."
        )
      );
    }
  };

  const hasPreview = Boolean(preview) && !previewFailed;

  return (
    <main className="create-page">
      <div className="studio">
        <header className="studio-header">
          <p className="eyebrow">Add a frame · Studio</p>
          <h1>
            New <em>exposure.</em>
          </h1>
          <p>
            Choose one photograph, then write the note that belongs beside it.
          </p>
        </header>

        <form className="studio-form" onSubmit={handleSubmit} noValidate>
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
              hasPreview ? "Change selected photograph" : "Choose a photograph"
            }
          >
            {hasPreview ? (
              <>
                <img
                  src={preview}
                  alt="Selected photograph preview"
                  className="dropzone-preview"
                  onError={() => setPreviewFailed(true)}
                />
                <span className="dropzone-change">Change photograph</span>
              </>
            ) : (
              <div className="dropzone-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="14" rx="1.5" />
                  <circle cx="12" cy="13" r="3.2" />
                  <path d="m8 6 1.4-2h5.2L16 6" />
                </svg>
                <strong>
                  {previewFailed ? "Preview unavailable" : "Drop a photograph"}
                </strong>
                <span>or click to browse</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="frame-image"
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="frame-caption">Caption</label>
              <span className="field-hint">{caption.length} / 2200</span>
            </div>
            <textarea
              id="frame-caption"
              name="caption"
              maxLength={2200}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="A note in the margin…"
              aria-describedby="frame-caption-hint"
            />
            <p className="field-hint" id="frame-caption-hint">
              Optional — the photograph can speak for itself.
            </p>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="studio-actions">
            <p className="studio-note">One photograph per entry.</p>
            <button
              type="submit"
              className={`button primary-button${
                loading ? " is-loading" : ""
              }`}
              disabled={!file || loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Adding frame…
                </>
              ) : (
                "Add frame"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default CreatePost;
