import { useEffect, useState } from "react";
import { getInitials } from "../utils/format";
import "../avatar.scss";

const Avatar = ({ src, name, className = "" }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className={`avatar ${className}`.trim()}>
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="avatar-initials" aria-hidden="true">
          {getInitials(name)}
        </span>
      )}
    </span>
  );
};

export default Avatar;
