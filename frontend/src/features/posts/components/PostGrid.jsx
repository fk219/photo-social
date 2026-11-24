import { useState } from "react";
import { formatCount } from "../../shared/utils/format";
import "../style/post-grid.scss";

const HeartGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
  </svg>
);

const CommentGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  </svg>
);

const PhotoGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <circle cx="12" cy="13" r="3.2" />
    <path d="m8 6 1.4-2h5.2L16 6" />
  </svg>
);

const GridTile = ({ post, index, onSelect }) => {
  const [failed, setFailed] = useState(false);
  const author = post?.user?.username || "unknown";
  const caption =
    typeof post?.caption === "string" ? post.caption.trim() : "";
  const likes = Number(post?.likesCount) || 0;
  const comments = Number(post?.commentsCount) || 0;
  const image = post?.thumbnail_url || post?.image_url || "";
  const alt = caption
    ? `Photo by @${author}: ${caption.slice(0, 120)}`
    : `Photo by @${author}`;

  return (
    <button
      type="button"
      className="post-grid-tile"
      onClick={() => onSelect(post)}
      aria-haspopup="dialog"
      aria-label={`Open post by @${author}${
        comments > 0
          ? `, ${comments} ${comments === 1 ? "comment" : "comments"}`
          : ""
      }${likes > 0 ? `, ${likes} ${likes === 1 ? "like" : "likes"}` : ""}`}
    >
      {image && !failed ? (
        <img
          src={image}
          alt={alt}
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="post-grid-fallback" role="img" aria-label={alt}>
          <PhotoGlyph />
        </span>
      )}

      <span className="post-grid-overlay" aria-hidden="true">
        <span>
          <HeartGlyph />
          {formatCount(likes)}
        </span>
        <span>
          <CommentGlyph />
          {formatCount(comments)}
        </span>
      </span>
    </button>
  );
};

const PostGrid = ({ posts = [], onSelect }) => (
  <div className="post-grid">
    {posts.map((post, index) => (
      <GridTile
        key={post._id ?? index}
        post={post}
        index={index}
        onSelect={onSelect}
      />
    ))}
  </div>
);

export const PostGridSkeleton = ({ count = 9 }) => (
  <div className="post-grid post-grid--skeleton" aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <span className="post-grid-skeleton" key={index} />
    ))}
  </div>
);

export default PostGrid;
