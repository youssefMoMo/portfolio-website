import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Modal — portal-rendered overlay that escapes ancestor transform contexts.
 *
 * Why this exists: any ancestor with `transform`, `filter`, `perspective`, or
 * `will-change: transform` becomes a "containing block" for `position: fixed`
 * descendants (CSS spec). Our App.tsx PageWrapper applies framer-motion
 * transforms during page transitions, breaking any in-tree fixed-position
 * modal. Rendering at document.body via createPortal sidesteps the problem.
 *
 * Features:
 *   - Centered with overlay (always relative to viewport)
 *   - ESC closes
 *   - Outside-click (overlay) closes
 *   - Body scroll lock with scrollbar-width compensation (no layout shift)
 *   - Smooth fade + scale animation
 *   - SSR-safe (no-op when document is undefined)
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** className applied to the inner content wrapper. Pass your design here. */
  contentClassName?: string;
  /** Set false to render content full-bleed (no max-width / padding). */
  centered?: boolean;
  /** Set false to disable closing on overlay click. Default: true. */
  closeOnOverlayClick?: boolean;
  /** Set false to disable ESC closing. Default: true. */
  closeOnEsc?: boolean;
  /** ARIA label for the dialog. */
  ariaLabel?: string;
}

export function Modal({
  open,
  onClose,
  children,
  contentClassName = "",
  centered = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  ariaLabel = "Dialog",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // ESC handler
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  // Body scroll lock with scrollbar compensation
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const body = document.body;
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const prev = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }, [open]);

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!closeOnOverlayClick) return;
      // Only close if the press started on the overlay itself, prevents
      // accidental close when text-selecting from inside the dialog.
      if (e.target === overlayRef.current) onClose();
    },
    [closeOnOverlayClick, onClose],
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={`fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm ${
            centered ? "flex items-center justify-center" : ""
          } p-4`}
          style={{ overscrollBehavior: "contain" }}
          onMouseDown={handleOverlayMouseDown}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={`relative max-h-[90vh] overflow-auto ${contentClassName}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default Modal;
