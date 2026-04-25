import { useState } from "react";

type PostImageProps = {
  src?: string;
  alt?: string;
  className?: string;
};

const DEFAULT_POST_IMAGE_SRC = "/default-recipe.jpg";

export default function PostImage({
  src,
  alt = "",
  className = "postImage",
}: PostImageProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = src?.trim() ?? "";
  const finalSrc = !hasError && normalizedSrc ? normalizedSrc : DEFAULT_POST_IMAGE_SRC;

  return <img className={className} src={finalSrc} alt={alt} onError={() => setHasError(true)} />;
}
