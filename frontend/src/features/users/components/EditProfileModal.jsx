import { useRef, useState } from "react";
import AppModal from "../../shared/components/AppModal";
import Avatar from "../../shared/components/Avatar";
import { useAuth } from "../../auth/hooks/useAuth";
import { getErrorMessage } from "../../shared/utils/error";
import { compressImage } from "../../shared/utils/image";
import { getUserAvatar } from "../../shared/utils/format";
import { updateMe, uploadAvatar } from "../services/user.api";
import "../style/edit-profile.scss";

const NAME_LIMIT = 60;
const BIO_LIMIT = 160;

const EditProfileModal = ({ profile, onClose, onSaved }) => {
  const { updateUser } = useAuth();
  const fileRef = useRef(null);
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [preview, setPreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");

    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch (err) {
      setError(getErrorMessage(err, "That photo could not be prepared."));
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;

    const cleanName = name.trim();
    const cleanBio = bio.trim();

    if (cleanName.length > NAME_LIMIT) {
      setError(`Names are limited to ${NAME_LIMIT} characters.`);
      return;
    }

    if (cleanBio.length > BIO_LIMIT) {
      setError(`Bios are limited to ${BIO_LIMIT} characters.`);
      return;
    }

    setSaving(true);
    setError("");

    try {
      let nextImage = profile?.profile_image;

      if (imageFile) {
        const uploaded = await uploadAvatar(imageFile);
        nextImage = uploaded?.user?.profile_image || nextImage;
      }

      const data = await updateMe({ name: cleanName, bio: cleanBio });
      const updated = data?.user;
      const patch = {
        name: updated?.name ?? cleanName,
        bio: updated?.bio ?? cleanBio,
        profile_image: nextImage,
      };

      updateUser(patch);
      onSaved?.(patch);
      onClose?.();
    } catch (err) {
      setError(
        getErrorMessage(err, "Your profile could not be saved. Try again.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      title="Edit profile"
      description="Change how people see you across PhotoSocial."
      onClose={onClose}
      size="sm"
    >
      <form className="edit-profile" onSubmit={save} noValidate>
        <div className="edit-profile-avatar">
          <Avatar
            src={preview || getUserAvatar(profile)}
            name={name || profile?.username}
            className="avatar--edit"
          />
          <div>
            <button
              type="button"
              className="button secondary-button button--small"
              onClick={() => fileRef.current?.click()}
              disabled={saving}
            >
              Change photo
            </button>
            <p>JPEG, PNG or WebP. Resized to 1600 px before upload.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={choosePhoto}
            tabIndex={-1}
          />
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="edit-name">Name</label>
            <span className="field-hint">
              {name.length} / {NAME_LIMIT}
            </span>
          </div>
          <input
            id="edit-name"
            type="text"
            value={name}
            maxLength={NAME_LIMIT}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            disabled={saving}
          />
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="edit-bio">Bio</label>
            <span className="field-hint">
              {bio.length} / {BIO_LIMIT}
            </span>
          </div>
          <textarea
            id="edit-bio"
            value={bio}
            maxLength={BIO_LIMIT}
            rows={3}
            onChange={(event) => setBio(event.target.value)}
            placeholder="A short description of you or the photos you share."
            disabled={saving}
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="edit-profile-actions">
          <button
            type="submit"
            className="button primary-button"
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
          <button
            type="button"
            className="button secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </AppModal>
  );
};

export default EditProfileModal;
