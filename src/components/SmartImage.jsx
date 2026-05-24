/**
 * SmartImage.jsx — DEPRECATED
 *
 * This file is an official deprecation shim. All logic has been removed.
 *
 * Migration guide:
 *   Before:  import SmartImage from "@/components/SmartImage";
 *   After:   import SafeImage  from "@/components/SafeImage";
 *            // or named: import { SafeImage } from "@/components/SafeImage";
 *
 * SmartImage's original props map directly onto SafeImage:
 *   src, alt, fallback, loading, decoding, onError, onLoad,
 *   className, style — all identical.
 *
 * SafeImage adds:
 *   fallbackIcon    — ReactNode rendered when both src and fallback fail
 *   wrapperClassName / containerClassName — class on the fallback wrapper
 *   width, height   — passed to the underlying <img> for CLS stability
 *
 * This shim re-exports SafeImage as both the named export `SmartImage` and
 * as the default export so existing import styles continue to work during
 * the migration period. It will be deleted once all consumer files are
 * updated to import SafeImage directly.
 *
 * @deprecated — use SafeImage from "@/components/SafeImage" instead.
 */

// eslint-disable-next-line no-restricted-imports
import SafeImage from "./SafeImage";

export { SafeImage as SmartImage };
export default SafeImage;
