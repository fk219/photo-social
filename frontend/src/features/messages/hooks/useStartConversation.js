import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../shared/utils/error";
import { startConversation } from "../services/messages.api";

export const useStartConversation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [startingWith, setStartingWith] = useState("");
  const [error, setError] = useState("");

  const openConversation = async (username) => {
    if (!username || startingWith) return null;

    setStartingWith(username);
    setError("");

    try {
      const data = await startConversation(username);
      const conversation = data?.conversation;

      if (!conversation?._id) {
        throw new Error("Conversation unavailable");
      }

      navigate(`/messages/${conversation._id}`, {
        state: { from: location.pathname },
      });

      return conversation;
    } catch (err) {
      setError(
        getErrorMessage(err, "That message could not be started. Try again.")
      );
      return null;
    } finally {
      setStartingWith("");
    }
  };

  return { startingWith, error, openConversation };
};
