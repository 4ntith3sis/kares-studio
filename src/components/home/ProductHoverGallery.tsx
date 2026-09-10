'use client';

import { useEffect, useRef, useState } from 'react';
import CardImage from './CardImage';

const SLIDE_MS = 1800;

/**
 * New Arrivals card photo: primary image by default; on hover the photo
 * slowly crossfades through the product's other photos in a continuous
 * loop. Leaving the card stops the loop and fades back to primary.
 */
export default function ProductHoverGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!hovering || images.length < 2) return;
    timer.current = window.setInterval(() => {
      setActive((a) => (a + 1) % images.length);
    }, SLIDE_MS);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [hovering, images.length]);

  return (
    <div
      className="prod-img prod-gallery"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setActive(0);
      }}
    >
      {images.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className={`gal-layer${i === active ? ' on' : ''}`}
          aria-hidden={i === active ? undefined : true}
        >
          <CardImage src={src} alt={alt} />
        </div>
      ))}
    </div>
  );
}
