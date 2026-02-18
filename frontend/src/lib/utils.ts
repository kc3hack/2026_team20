import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Content } from "@/lib/api/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse JSON string to Content object
 */
export function parseContent(content: string | Content): Content {
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as Content;
    } catch {
      return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] };
    }
  }
  return content;
}

/**
 * Stringify Content object to JSON string
 */
export function stringifyContent(content: string | Content): string {
  if (typeof content === "string") {
    return content;
  }
  return JSON.stringify(content);
}

/**
 * Check if mock data mode is enabled
 */
export function useMockData(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === "true";
}
