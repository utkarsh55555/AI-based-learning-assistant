import React, { useRef, useEffect, useState } from 'react';

const frameCount = 300;
const currentFrame = (index: number) => (
  `/frames/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`
);

export const ScrollAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Preload images
    const loadImages = async () => {
      const imgArray: HTMLImageElement[] = [];
      let loadedCount = 0;
      for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        img.onload = () => {
          loadedCount++;
          if (loadedCount === frameCount) {
            setLoaded(true);
          }
        };
        // Also handle error so we don't block indefinitely
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === frameCount) {
            setLoaded(true);
          }
        }
        imgArray.push(img);
      }
      setImages(imgArray);
    };
    loadImages();
  }, []);

  useEffect(() => {
    if (!loaded || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Use the first valid image, or default to the first
    const firstImg = images.find(img => img.complete && img.naturalWidth !== 0) || images[0];
    
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    const render = (img: HTMLImageElement) => {
      if (!img.complete || img.naturalWidth === 0) return;
      
      // Calculate scaling to fill the screen (object-cover equivalent)
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, x, y, img.width * scale, img.height * scale);
    };

    render(firstImg);

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const containerTop = containerRef.current?.offsetTop || 0;
      // Scroll height relative to viewport
      const maxScroll = containerRef.current!.scrollHeight - window.innerHeight;
      
      let scrollFraction = (scrollTop - containerTop) / maxScroll;
      if (scrollFraction < 0) scrollFraction = 0;
      if (scrollFraction > 1) scrollFraction = 1;

      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(scrollFraction * frameCount)
      );

      requestAnimationFrame(() => render(images[frameIndex]));
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', () => {
      setCanvasSize();
      handleScroll();
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [loaded, images]);

  return (
    <div ref={containerRef} className="relative h-[400vh] w-full bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white z-10 bg-black/50">
            <div className="animate-pulse">Loading animation...</div>
          </div>
        )}
      </div>
    </div>
  );
};
