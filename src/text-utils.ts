/**
 * Text utility functions for cleaning and processing text content
 */

/**
 * Remove emojis and other Unicode symbols from text
 * This regex matches emoji ranges and other Unicode symbols
 */
export function removeEmojis(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  
  // Remove emojis and other Unicode symbols
  // This regex covers:
  // - Emoticons (😀-🙏)
  // - Miscellaneous Symbols and Pictographs (🀀-🿿)
  // - Supplemental Symbols and Pictographs (🈀-🈿)
  // - Transport and Map Symbols (🚀-🛿)
  // - Enclosed characters (Ⓜ-⓿)
  // - Regional indicator symbols (🇦-🇿)
  // - Other Unicode symbol ranges
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Miscellaneous Symbols and Pictographs
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map Symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Miscellaneous Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional Indicator Symbols (flags)
    .replace(/[\u{200D}]/gu, '')            // Zero Width Joiner
    .replace(/[\u{FE0F}]/gu, '')            // Variation Selector-16
    .replace(/[\u{20E3}]/gu, '')            // Combining Enclosing Keycap
    .trim();
}

/**
 * Clean and truncate text content for event tracking
 * Removes emojis, trims whitespace, and limits length
 */
export function cleanElementText(text: string | null | undefined, maxLength: number = 100): string | undefined {
  if (!text) return undefined;
  
  const cleaned = removeEmojis(text);
  if (!cleaned) return undefined;
  
  return cleaned.substring(0, maxLength) || undefined;
}
