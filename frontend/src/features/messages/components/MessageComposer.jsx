import { useId, useRef, useState } from "react";
import { getErrorMessage } from "../../shared/utils/error";

const MAX_MESSAGE = 2000;

const MessageComposer = ({ onSend }) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const formRef = useRef(null);
  const errorId = useId();
  const countId = useId();

  const focusComposer = () => {
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const text = draft.trim();

    if (!text || sending) return;
    if (text.length > MAX_MESSAGE) {
      setError(`Messages are limited to ${MAX_MESSAGE} characters.`);
      return;
    }

    setSending(true);
    setError("");
    setDraft("");

    try {
      await onSend(text);
    } catch (err) {
      setDraft(text);
      setError(
        getErrorMessage(err, "Your message could not be sent. Try again.")
      );
    } finally {
      setSending(false);
      focusComposer();
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent?.isComposing
    ) {
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  const canSend = Boolean(draft.trim()) && !sending;

  return (
    <form
      ref={formRef}
      className="messages-composer"
      onSubmit={handleSubmit}
      noValidate
    >
      <label htmlFor="message-draft" className="sr-only">
        Write a message
      </label>

      <div className="messages-composer-field">
        <textarea
          ref={textareaRef}
          id="message-draft"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError("");
          }}
          onKeyDown={handleKeyDown}
          maxLength={MAX_MESSAGE}
          rows={1}
          placeholder="Message..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : countId}
        />

        <button
          type="submit"
          className="messages-send"
          disabled={!canSend}
          aria-busy={sending}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <span className="messages-counter" id={countId}>
        {draft.length > 1600 ? `${draft.length} / ${MAX_MESSAGE}` : ""}
      </span>

      {error && (
        <p className="messages-inline-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default MessageComposer;
