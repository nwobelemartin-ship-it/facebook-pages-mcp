import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// NOTE: The prompt's import block assumed `getPageInfo`/`getPageInsights`-style
// names. The real exports use the `handle*` prefix and are distributed across
// modules differently than assumed. Adjusted to the actual exports below;
// no source files under src/tools/ were renamed.
import {
  getPageInfoSchema,
  getPageFeedSchema,
  handleGetPageInfo,
  handleGetPageFeed,
} from "./tools/pages.js";
import {
  getPageInsightsSchema,
  getVideoInsightsSchema,
  handleGetPageInsights,
  handleGetVideoInsights,
} from "./tools/insights.js";
import {
  getPublishedPostsSchema,
  getPostInsightsSchema,
  getPostCommentsSchema,
  createPostSchema,
  handleGetPublishedPosts,
  handleGetPostInsights,
  handleGetPostComments,
  handleCreatePost,
} from "./tools/posts.js";
import {
  refreshTokenInfoSchema,
  handleRefreshTokenInfo,
} from "./tools/utils.js";

// FIX (bug #1): the current wrapHandler in src/index.ts returns errors as
// plain `content` without `isError: true`, so the LLM treats failures as
// successes. Preserve the same behavior otherwise.
function wrapHandler<TArgs, TResult>(
  handler: (args: TArgs) => Promise<TResult>
) {
  return async (args: TArgs) => {
    try {
      const result = await handler(args);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[tool error]", message);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}

export function buildServer(): McpServer {
  const server = new McpServer({
    name: "facebook-pages",
    // FIX (bug #2): the current src/index.ts hardcodes "1.0.0" while
    // package.json says "1.0.3". Use "1.0.3" and keep them in sync going
    // forward. If you bump package.json later, bump this too.
    version: "1.0.3",
  });

  // ─── Tool Registration (copied verbatim from src/index.ts) ─────────

  // 1. get_page_info
  server.tool(
    "get_page_info",
    "Retrieve Facebook Page metadata: name, category, follower count, contact info, location, hours, and cover photo.",
    getPageInfoSchema.shape,
    wrapHandler(handleGetPageInfo)
  );

  // 2. get_page_insights
  server.tool(
    "get_page_insights",
    "Retrieve page-level analytics (page_views_total, page_fans, page_fan_adds, page_fan_removes, page_actions_post_reactions_total). Supports day/week/days_28 periods and date ranges. NOTE: Legacy metrics page_impressions and page_reach are deprecated as of June 2026.",
    getPageInsightsSchema.shape,
    wrapHandler(handleGetPageInsights)
  );

  // 3. get_published_posts
  server.tool(
    "get_published_posts",
    "Retrieve a paginated list of posts published by the page, including message, image, permalink, shares, and type.",
    getPublishedPostsSchema.shape,
    wrapHandler(handleGetPublishedPosts)
  );

  // 4. get_post_insights
  server.tool(
    "get_post_insights",
    "Retrieve engagement metrics for a specific post: impressions, engaged users, clicks, reactions by type, and activity by action type.",
    getPostInsightsSchema.shape,
    wrapHandler(handleGetPostInsights)
  );

  // 5. get_post_comments
  server.tool(
    "get_post_comments",
    "Retrieve paginated comments on a specific post, including author, timestamp, like count, and reply count.",
    getPostCommentsSchema.shape,
    wrapHandler(handleGetPostComments)
  );

  // 6. get_video_insights
  server.tool(
    "get_video_insights",
    "Retrieve performance metrics for a specific video: views, impressions, average watch time, total watch time, and reactions by type.",
    getVideoInsightsSchema.shape,
    wrapHandler(handleGetVideoInsights)
  );

  // 7. get_page_feed
  server.tool(
    "get_page_feed",
    "Retrieve the full page feed including visitor posts (unlike published_posts which only returns page-authored posts).",
    getPageFeedSchema.shape,
    wrapHandler(handleGetPageFeed)
  );

  // 8. create_post
  server.tool(
    "create_post",
    "Create a new post on the Facebook Page. Supports text posts, link posts, and photo posts. Returns the new post ID.",
    createPostSchema.shape,
    wrapHandler(handleCreatePost)
  );

  // 9. refresh_token_info
  server.tool(
    "refresh_token_info",
    "Inspect the current access token to check validity, expiration date, and granted scopes. Useful for diagnosing auth issues.",
    refreshTokenInfoSchema.shape,
    wrapHandler(handleRefreshTokenInfo)
  );

  return server;
}
