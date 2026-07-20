/**
 * Base URL for the internal LeetCode proxy.
 * In production (Vercel) NEXT_PUBLIC_APP_URL must be set to your deployed URL.
 * Falls back to localhost in development.
 */
function getLeetCodeProxyUrl(): string {
  // NEXT_PUBLIC_APP_URL: manually set (dev or prod override)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/leetcode`;
  }
  // VERCEL_URL: auto-set by Vercel on every deployment (no protocol prefix)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/leetcode`;
  }
  // Local development fallback
  return `http://localhost:${process.env.PORT ?? 3000}/api/leetcode`;
}

/**
 * Sends a GraphQL request through the internal /api/leetcode proxy.
 */
async function graphqlFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const url = getLeetCodeProxyUrl();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`LeetCode proxy responded with status ${response.status}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error);
  }
  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? "GraphQL error");
  }
  return json;
}

export interface LeetCodeSubmission {
  title: string;
  titleSlug: string;
  timestamp: string; // Unix timestamp as a string
}

/**
 * Fetches recent accepted submissions for a specific LeetCode user from LeetCode's public GraphQL API.
 * 
 * @param username The LeetCode username/handle
 * @param limit The maximum number of submissions to fetch (default: 100)
 * @returns A promise resolving to an array of LeetCodeSubmission objects
 */
export async function fetchRecentSubmissions(
  username: string,
  limit = 100
): Promise<LeetCodeSubmission[]> {
  const query = `
    query userRecentAcSubmissions($username: String!, $limit: Int) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const json = await graphqlFetch<{ data?: { recentAcSubmissionList?: LeetCodeSubmission[] } }>(
      query,
      { username, limit }
    );
    return json.data?.recentAcSubmissionList || [];
  } catch (error) {
    console.error("Failed fetching submissions from LeetCode:", error);
    throw error;
  }
}

export interface LeetCodeProblemDetails {
  title: string;
  leetcode_num: number;
  title_slug: string;
  difficulty: string;
  patterns: string[];
}

/**
 * Fetches specific question details (title, ID, difficulty, patterns) from LeetCode's GraphQL API.
 * 
 * @param titleSlug The URL slug of the LeetCode question
 * @returns A promise resolving to the LeetCodeProblemDetails or null if not found
 */
export async function fetchProblemDetails(
  titleSlug: string
): Promise<LeetCodeProblemDetails | null> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags {
          name
        }
      }
    }
  `;

  try {
    const json = await graphqlFetch<{ data?: { question?: Record<string, unknown> } }>(
      query,
      { titleSlug }
    );
    const question = json.data?.question as {
      title: string;
      questionFrontendId: string;
      titleSlug: string;
      difficulty: string;
      topicTags: { name: string }[];
    } | undefined;

    if (!question) return null;

    return {
      title: question.title,
      leetcode_num: parseInt(question.questionFrontendId, 10) || 0,
      title_slug: question.titleSlug,
      difficulty: question.difficulty,
      patterns: question.topicTags?.map((t) => t.name) || [],
    };
  } catch (error) {
    console.error(`Failed to fetch details for slug ${titleSlug}:`, error);
    return null;
  }
}

export interface LeetCodeTagQuestion {
  frontendQuestionId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  topicTags: {
    name: string;
    slug: string;
  }[];
}

const PROBLEMSET_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      questions: data {
        frontendQuestionId: questionFrontendId
        title
        titleSlug
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  }
`;

type ProblemsetResponse = { data?: { problemsetQuestionList?: { questions: LeetCodeTagQuestion[] } } };

export async function fetchProblemsByTag(tagSlug: string, limit = 10): Promise<LeetCodeTagQuestion[]> {
  try {
    const json = await graphqlFetch<ProblemsetResponse>(
      PROBLEMSET_QUERY,
      { categorySlug: "", limit, skip: 0, filters: { tags: [tagSlug] } }
    );
    return json.data?.problemsetQuestionList?.questions || [];
  } catch (err) {
    console.error("Error fetching problems by tag from LeetCode:", err);
    return [];
  }
}

export async function fetchRandomLeetCodeProblems(difficulty: "MEDIUM" | "HARD", limit = 50): Promise<LeetCodeTagQuestion[]> {
  const maxSkip = difficulty === "MEDIUM" ? 1200 : 500;
  const randomSkip = Math.floor(Math.random() * maxSkip);

  try {
    const json = await graphqlFetch<ProblemsetResponse>(
      PROBLEMSET_QUERY,
      { categorySlug: "", limit, skip: randomSkip, filters: { difficulty } }
    );
    return json.data?.problemsetQuestionList?.questions || [];
  } catch (err) {
    console.error("Error fetching random problems from LeetCode:", err);
    return [];
  }
}

