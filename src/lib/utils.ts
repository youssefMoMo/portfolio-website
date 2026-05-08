import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with smart conflict resolution.
 * 
 * This utility combines clsx for conditional class names with tailwind-merge
 * to handle Tailwind CSS class conflicts intelligently.
 * 
 * @example
 * cn("btn", "btn-primary") // => "btn btn-primary"
 * cn("p-4", "p-2") // => "p-2" (tailwind-merge resolves the conflict)
 * cn("btn", { primary: true }, "rounded-lg") // => "btn primary rounded-lg"
 * 
 * @param inputs - Class values to merge (strings, objects, arrays, etc.)
 * @returns Merged class name string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}