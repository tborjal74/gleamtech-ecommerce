import React, { useEffect, useMemo, useState } from "react";

import { resolveImageUrl } from "../api";
import { cn } from "../components/ui/utils";
import { fallbackProductImage, type ProductImageLike } from "./productImages";

type ProductImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "alt" | "onError" | "src"> & {
  product: ProductImageLike;
  src?: string | null;
  alt?: string;
};

export function ProductImage({ product, src, alt = product.name, className, loading = "lazy", ...props }: ProductImageProps) {
  const fallback = useMemo(() => fallbackProductImage(product), [product.name, product.sku]);
  const requestedSource = resolveImageUrl(src || product.image || "") || fallback;
  const [imageSrc, setImageSrc] = useState(requestedSource);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setImageSrc(requestedSource);
    setUnavailable(false);
  }, [requestedSource]);

  if (unavailable) {
    return (
      <span
        role="img"
        aria-label={`${alt} image unavailable`}
        className={cn("inline-flex items-center justify-center bg-secondary text-sm font-semibold text-muted-foreground", className)}
      >
        {product.name.trim().charAt(0).toUpperCase() || "G"}
      </span>
    );
  }

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => {
        if (imageSrc !== fallback) {
          setImageSrc(fallback);
          return;
        }
        setUnavailable(true);
      }}
    />
  );
}
