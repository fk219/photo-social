import { createContext, useState } from "react";

export const PostContext = createContext();

export const PostContextProvider = ({ children }) => {
  const [feeds, setFeeds] = useState({});

  return (
    <PostContext.Provider value={{ feeds, setFeeds }}>
      {children}
    </PostContext.Provider>
  );
};
