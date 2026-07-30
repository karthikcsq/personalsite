export type ChatSuggestionCategory = "work" | "opinions" | "life";

export type ChatSuggestion = {
  text: string;
  tags: readonly ChatSuggestionCategory[];
};

export const CHAT_SUGGESTIONS: readonly ChatSuggestion[] = [
  { text: "What is Karthik building right now?", tags: ["work"] },
  { text: "Where has he worked?", tags: ["work"] },
  { text: "Show me his research.", tags: ["work"] },
  { text: "Tell me about Repple.", tags: ["work"] },
  { text: "What is google-tools-mcp?", tags: ["work"] },
  { text: "Which hackathons has he won?", tags: ["work"] },
  { text: "Tell me about buildpurdue.", tags: ["work"] },
  { text: "What did he do at Peraton Labs?", tags: ["work"] },
  { text: "What's Veritas?", tags: ["work"] },
  { text: "What's Caladrius?", tags: ["work"] },
  { text: "What did he build at the Naval Research Lab?", tags: ["work"] },
  { text: "Has he done quantum computing research?", tags: ["work"] },
  { text: "What tools does he use to build?", tags: ["work"] },
  { text: "Show me his favorite project.", tags: ["work", "opinions"] },
  { text: "What's his take on MCP?", tags: ["opinions"] },
  { text: "What does he write about?", tags: ["opinions"] },
  {
    text: "What's his view on the future of AI work?",
    tags: ["opinions"],
  },
  { text: "Does he think AGI is close?", tags: ["opinions"] },
  { text: "What AI company would he start?", tags: ["opinions"] },
  {
    text: "What makes a great engineer in his view?",
    tags: ["opinions"],
  },
  {
    text: "What does he think about quantum computing?",
    tags: ["opinions"],
  },
  {
    text: "Why did he co-found buildpurdue?",
    tags: ["opinions", "work"],
  },
  {
    text: "What does he do at buildpurdue?",
    tags: ["opinions", "work"],
  },
  {
    text: "Why can't agents book a restaurant yet?",
    tags: ["opinions"],
  },
  { text: "How did he get into AI?", tags: ["life"] },
  { text: "Where did he grow up?", tags: ["life"] },
  { text: "Tell me about his time at TJHSST.", tags: ["life"] },
  { text: "What's he studying at Purdue?", tags: ["life"] },
  { text: "Tell me something surprising about him.", tags: ["life"] },
  { text: "Does he play any instruments?", tags: ["life"] },
  { text: "Show me his photography.", tags: ["life"] },
  { text: "What does he do outside of code?", tags: ["life"] },
  { text: "Where is he based?", tags: ["life"] },
];

export const CHAT_SUGGESTION_CATEGORIES: readonly ChatSuggestionCategory[] = [
  "work",
  "opinions",
  "life",
];

export function normalizeSuggestedQuestion(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?.!]+$/, "")
    .toLowerCase();
}

const suggestionKeys = new Set(
  CHAT_SUGGESTIONS.map((suggestion) =>
    normalizeSuggestedQuestion(suggestion.text),
  ),
);

export function isHostSuggestedQuestion(value: string): boolean {
  return suggestionKeys.has(normalizeSuggestedQuestion(value));
}
