import { useState, useEffect } from 'react';

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const scrolled = (window.scrollY / scrollHeight) * 100;
        setProgress(Math.min(100, Math.max(0, scrolled)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-50 bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[var(--ochre)] to-[var(--cinnabar)] transition-all duration-150 ease-out shadow-xs"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
