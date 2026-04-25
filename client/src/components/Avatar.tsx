import { useState } from "react";

type AvatarProps = {
  src?: string;
  name?: string;
  className?: string;
  alt?: string;
};

const DEFAULT_AVATAR_SRC = "/default-avatar.svg";

export default function Avatar({
  src,
  name = "",
  className = "avatar",
  alt = "",
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = src?.trim() ?? "";
  const finalSrc = !hasError && normalizedSrc ? normalizedSrc : DEFAULT_AVATAR_SRC;

  return (
    <div className={className}>
      <img src={finalSrc} alt={alt || `${name} avatar`} onError={() => setHasError(true)} />
    </div>
  );
}
