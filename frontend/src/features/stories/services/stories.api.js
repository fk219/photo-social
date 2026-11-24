import { socialApi } from "../../shared/api/client";

export const getStoryFeed = async () => {
  const response = await socialApi.get("/stories/feed");
  return response.data;
};

export const createStory = async (imageFile, caption = "") => {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("caption", caption);
  const response = await socialApi.post("/stories", formData);
  return response.data;
};

export const markStorySeen = async (storyId) => {
  const response = await socialApi.post(`/stories/${storyId}/seen`);
  return response.data;
};

export const deleteStory = async (storyId) => {
  const response = await socialApi.delete(`/stories/${storyId}`);
  return response.data;
};
