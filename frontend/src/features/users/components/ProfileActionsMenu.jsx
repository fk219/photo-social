import { useEffect, useRef, useState } from "react";
import AppModal from "../../shared/components/AppModal";
import ReportDialog from "../../shared/components/ReportDialog";
import { getErrorMessage } from "../../shared/utils/error";
import {
  blockUser,
  unblockUser,
} from "../services/user.api";
import "../style/profile-menu.scss";

const ProfileActionsMenu = ({
  username,
  isBlocked,
  onBlockChange,
}) => {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const block = async () => {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      if (isBlocked) {
        await unblockUser(username);
      } else {
        await blockUser(username);
      }
      onBlockChange?.(!isBlocked);
      setOpen(false);
      setConfirmBlock(false);
    } catch (err) {
      setError(getErrorMessage(err, "That block could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="profile-menu-trigger"
        aria-label="More profile actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setError("");
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="profile-menu-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setReporting(true);
              setOpen(false);
            }}
          >
            Report account
          </button>
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={() => {
              setOpen(false);
              if (isBlocked) {
                block();
              } else {
                setConfirmBlock(true);
              }
            }}
            disabled={busy}
          >
            {busy
              ? "Saving..."
              : isBlocked
                ? `Unblock @${username}`
                : `Block @${username}`}
          </button>
          {error && (
            <p className="profile-menu-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {reporting && (
        <ReportDialog
          username={username}
          targetType="user"
          onClose={() => setReporting(false)}
        />
      )}

      {confirmBlock && (
        <AppModal
          title={`Block @${username}?`}
          description="They will not be able to follow you, message you or find your posts while signed in."
          onClose={() => setConfirmBlock(false)}
          size="sm"
        >
          <div className="block-confirm">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="button danger-button"
              onClick={block}
              disabled={busy}
            >
              {busy ? "Blocking..." : "Block account"}
            </button>
            <button
              type="button"
              className="button secondary-button"
              onClick={() => setConfirmBlock(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </AppModal>
      )}
    </div>
  );
};

export default ProfileActionsMenu;
