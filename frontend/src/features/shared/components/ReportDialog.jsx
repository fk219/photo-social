import { useState } from "react";
import AppModal from "./AppModal";
import { getErrorMessage } from "../utils/error";
import "../report.scss";
import { reportUser } from "../../users/services/user.api";

const REASONS = [
  "Spam",
  "Nudity or sexual content",
  "Hate speech or symbols",
  "Harassment or bullying",
  "Scam or fraud",
  "Something else",
];

const ReportDialog = ({
  username,
  targetType = "user",
  targetId,
  onClose,
}) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;

    const text = details.trim();
    const payloadReason = text ? `${reason}: ${text}` : reason;

    setSending(true);
    setError("");

    try {
      await reportUser(username, {
        reason: payloadReason.slice(0, 500),
        targetType,
        targetId,
      });
      setSent(true);
    } catch (err) {
      setError(
        getErrorMessage(err, "This report could not be sent. Try again.")
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AppModal
      title={sent ? "Report sent" : `Report @${username}`}
      description={
        sent
          ? "Thanks. The Mosaic team will review this report."
          : "Reports are private. The account will not be told who reported it."
      }
      onClose={onClose}
      size="sm"
    >
      {sent ? (
        <div className="report-done">
          <p>You can close this window now.</p>
          <button
            type="button"
            className="button primary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      ) : (
        <form className="report-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="report-reason">Reason</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={sending}
            >
              {REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="report-details">Details (optional)</label>
            <textarea
              id="report-details"
              value={details}
              maxLength={400}
              rows={3}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Tell us what happened."
              disabled={sending}
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="button primary-button"
            disabled={sending}
          >
            {sending ? "Sending..." : "Send report"}
          </button>
        </form>
      )}
    </AppModal>
  );
};

export default ReportDialog;
