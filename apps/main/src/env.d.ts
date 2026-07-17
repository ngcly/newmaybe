/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

/**
 * Custom properties attached to window/document for View Transitions listener cleanup.
 * Stored here rather than in each script to avoid repeated `as any` casts.
 * Each property holds a reference to the last-registered handler so it can be
 * removed before re-registering on subsequent astro:page-load events.
 */
interface Window {
  /** Escape-key close handler for the hamburger menu (Base.astro). */
  _handleEscape?: (e: KeyboardEvent) => void;
  /** Header scroll border handler (Base.astro). */
  _onScroll?: () => void;
  /** Poetry immersive-scroll handler (writing/[slug].astro is:inline). */
  _onScrollPoetry?: () => void;
  /** Poetry layout-toggle click handler (writing/[slug].astro is:inline). */
  _handleLayoutClick?: (e: Event) => void;
  /** IntersectionObserver instance for reveal animations (Base.astro). */
  _revealObserver?: IntersectionObserver;
  /** Reading progress bar scroll handler (writing/[slug].astro). */
  _onScrollReadingBar?: () => void;
  /** Search overlay Cmd+K keydown handler (Search.astro). */
  _searchKeydownHandler?: (e: KeyboardEvent) => void;
}

interface Document {
  /** Escape-key close handler stored on document for hamburger cleanup (Base.astro). */
  _handleEscape?: (e: KeyboardEvent) => void;
}
