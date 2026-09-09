'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Props = {
  src?: string;
  alt: string;
  placeholderLabel?: string;
  placeholderBackground?: string;
  className?: string;
  eager?: boolean;
  /** object-position override (default center). Useful when a portrait
   *  photo fills a landscape card so faces aren't cropped. */
  position?: string;
};

/**
 * Phase 1 image rule: every photo inside a shaped card must FILL the card
 * (width/height 100%, object-fit cover) and follow clip-path/border-radius.
 * When no real asset is wired yet — or a remote asset fails to load
 * (e.g. missing Storage object) — render the original placeholder label
 * so layout/shape stays 1:1 with homepage.html.
 */
export default function CardImage({
  src,
  alt,
  placeholderLabel,
  placeholderBackground,
  className,
  eager = false,
  position = 'center',
}: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={className ?? 'ph'}
        style={placeholderBackground ? { background: placeholderBackground } : undefined}
        aria-label={alt}
        role="img"
      >
        {placeholderLabel ?? ''}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 50vw"
      priority={eager}
      onError={() => setFailed(true)}
      style={{ objectFit: 'cover', objectPosition: position }}
    />
  );
}
