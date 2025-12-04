/**
 * LocalStorage utilities for Cloudflare credentials
 * 
 * Credentials are stored locally in the browser and never sent to any backend.
 */

import type { CloudflareCredentials } from "./service";

const STORAGE_KEY = "hosty_cloudflare_credentials";

/**
 * Save Cloudflare credentials to localStorage
 */
export function saveCredentials(credentials: CloudflareCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } catch {
    console.warn("Failed to save Cloudflare credentials to localStorage");
  }
}

/**
 * Load Cloudflare credentials from localStorage
 */
export function loadCredentials(): CloudflareCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (parsed.apiToken && parsed.zoneId) {
      return parsed as CloudflareCredentials;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear Cloudflare credentials from localStorage
 */
export function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn("Failed to clear Cloudflare credentials from localStorage");
  }
}

/**
 * Check if credentials are stored
 */
export function hasStoredCredentials(): boolean {
  return loadCredentials() !== null;
}

