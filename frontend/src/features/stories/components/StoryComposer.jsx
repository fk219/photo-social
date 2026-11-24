import { useEffect, useId, useRef, useState } from "react";
import AppModal from "../../shared/components/AppModal";
import { getErrorMessage } from "../../shared/utils/error";
import {
  ACCEPTED_IMAGE_TYPES,
  ALLOWED_IMAGE_TYPES,
  compressImage,
} from "../../shared/utils/image";
import { createStory } from "../services/stories.api";
import "../style/stories.scss";

const CAPTION_LIMIT = 300;

const StoryComposer = ({ onClose, onCreated }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const [caption, setCaption] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const compressionRef = useRef(0);
  const mountedRef = useRef(true);
  const captionId = useId();

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const acceptFile = async (candidate) => {
    setError("");

    if (!candidate) return;

    if (!ALLOWED_IMAGE_TYPES.has(candidate.type)) {
      compressionRef.current += 1;
      setCompressing(false);
      setFile(null);
      setPreview("");
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

      if (!mountedRef.current || compressionRef.current !== requestId) return;

      setFile(compressed);
    } catch (err) {
      if (!mountedRef.current || compressionRef.current !== requestId) return;

      setError(
        err?.message || "This photo could not be prepared for your story."
      );
      setFile(null);
    } finally {
      if (mountedRef.current && compressionRef.current === requestId) {
        setCompressing(false);
      }
    }
  };

  const handleFileChange = (event) => {
    const [selected] = event.target.files ?? [];

    event.target.value = "";
    acceptFile(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (sharing) return;

    if (!file) {
      setError(
        compressing
          ? "The photo is still being optimized."
          : "Choose a photo before sharing your story."
      );
      return;
    }

    setSharing(true);
    setError("");

    try {
      const data = await createStory(file, caption.trim());

      if (!mountedRef.current) return;

      const story = data?.story ?? data;

      window.dispatchEvent(new Event("mosaic:stories-changed"));
      onCreated?.(story);
      onClose?.();
    } catch (err) {
      if (mountedRef.current) {
        setError(
          getErrorMessage(
            err,
            "Your story could not be shared. Try again."
          )
        );
      }
    } finally {
      if (mountedRef.current) setSharing(false);
    }
  };

  const hasPreview = Boolean(preview) && !previewFailed;
  const canShare = Boolean(file) && !compressing && !sharing;

  return (
    <AppModal
      title="Add to your story"
      description="Share a photo for the next 24 hours."
      onClose={onClose}
      closeLabel="Close story composer"
    >
      <form className="story-composer" onSubmit={handleSubmit} noValidate>
        <div className="story-composer-media">
          <div
            className={`story-dropzone${hasPreview ? " has-preview" : ""}`}
          >
            {hasPreview ? (
              <img
                src={preview}
                alt="Selected story photo preview"
                className="story-preview"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <div className="story-dropzone-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="14" rx="2" />
                  <circle cx="12" cy="13" r="3.2" />
                  <path d="m8 6 1.4-2h5.2L16 6" />
                </svg>
                <strong>
                  {previewFailed ? "Preview unavailable" : "Choose a photo"}
                </strong>
                <span>JPEG, PNG, or WebP</span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            id="story-image"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            hidden
            onChange={handleFileChange}
          />

          <div className="story-media-actions">
            <button
              type="button"
              className="button secondary-button button--small"
              onClick={() => fileInputRef.current?.click()}
              disabled={compressing || sharing}
            >
              {hasPreview ? "Change photo" : "Choose photo"}
            </button>

            <span className="story-progress-note" role="status" aria-live="polite">
              {compressing
                ? "Optimizing photo..."
                : sharing
                  ? "Sharing to your story..."
                  : file
                    ? "Photo ready"
                    : ""}
            </span>
          </div>
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor={captionId}>Caption</label>
            <span className="field-hint">
              {caption.length} / {CAPTION_LIMIT}
            </span>
          </div>
          <textarea
            id={captionId}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={CAPTION_LIMIT}
            rows={2}
            placeholder="Add a caption (optional)"
            disabled={sharing}
          />
        </div>

        {error && (
          <p className="story-composer-error" role="alert">
            {error}
          </p>
        )}

        <div className="story-composer-actions">
          <button
            type="button"
            className="button secondary-button"
            onClick={onClose}
            disabled={sharing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`button primary-button${
              sharing ? " is-loading" : ""
            }`}
            disabled={!canShare}
            aria-busy={sharing || compressing}
          >
            {sharing ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Sharing...
              </>
            ) : compressing ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Optimizing...
              </>
            ) : (
              "Share story"
            )}
          </button>
        </div>
      </form>
    </AppModal>
  );
};

export default StoryComposer;
