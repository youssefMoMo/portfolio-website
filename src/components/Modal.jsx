import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

/**
 * Modal — drop-in replacement.
 *
 * Props:
 *   isOpen      boolean      — controls visibility
 *   onClose     () => void   — called on overlay click, ESC, or close button
 *   children    ReactNode    — your existing modal content (design unchanged)
 *   className   string?      — extra class on the .modal-content container
 *   showClose   boolean?     — render the X button (default: true)
 *   closeOnOverlay boolean?  — close on outside click (default: true)
 *   closeOnEsc  boolean?     — close on ESC key (default: true)
 *   ariaLabel   string?      — a11y label for the dialog
 *
 * This component intentionally adds NO visual styling to your content.
 * It only handles: positioning, overlay, scroll lock, focus, and dismissal.
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  showClose = true,
  closeOnOverlay = true,
  closeOnEsc = true,
  ariaLabel = 'Dialog',
}) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const previouslyFocused = useRef(null);

  // ESC to close
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeOnEsc, onClose]);

  // Lock body scroll while open (preserves scrollbar width to avoid layout shift)
  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollBarWidth = window.innerWidth - html.clientWidth;
    const prev = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }, [isOpen]);

  // Manage focus: save previous, focus modal on open, restore on close
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement;
    // Defer to ensure node is in the DOM
    const t = setTimeout(() => {
      contentRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [isOpen]);

  const handleOverlayMouseDown = useCallback(
    (e) => {
      if (!closeOnOverlay) return;
      // Only close if the mousedown started on the overlay itself,
      // not on a descendant — prevents accidental closes when dragging text.
      if (e.target === overlayRef.current) onClose?.();
    },
    [closeOnOverlay, onClose]
  );

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={contentRef}
        className={`modal-content ${className}`.trim()}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {showClose && (
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}