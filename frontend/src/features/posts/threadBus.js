const THREAD_EVENT = "mosaic:open-thread";

export const openThread = (postId) => {
  if (typeof window === "undefined" || !postId) return;

  window.dispatchEvent(
    new CustomEvent(THREAD_EVENT, { detail: { postId } })
  );
};

export const subscribeToThreads = (handler) => {
  if (typeof window === "undefined") return () => {};

  const listener = (event) => {
    const postId = event?.detail?.postId;
    if (postId) handler(postId);
  };

  window.addEventListener(THREAD_EVENT, listener);

  return () => {
    window.removeEventListener(THREAD_EVENT, listener);
  };
};
