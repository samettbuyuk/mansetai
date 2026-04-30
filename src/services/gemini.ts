export interface ProcessedNews {
  id: string;
  originalHeadline: string;
  formattedHeadline: string;
  spot: string;
  content: string;
  subheadings: string[];
}

export type ProcessMode = 'meta' | 'full';

export async function processNewsBatch(rawText: string, mode: ProcessMode = 'meta'): Promise<ProcessedNews[]> {
  try {
    const response = await fetch("/api/process-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText, mode }),
    });

    if (!response.ok) throw new Error("Backend error");
    return await response.json();
  } catch (error) {
    console.error("News processing error:", error);
    throw error;
  }
}

export async function generateNews(topic: string): Promise<ProcessedNews[]> {
  try {
    const response = await fetch("/api/generate-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) throw new Error("Backend error");
    return await response.json();
  } catch (error) {
    console.error("News generation error:", error);
    throw error;
  }
}

