<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# General Rules

## Writing Style

- Do NOT use the em dash character anywhere in code, comments, UI text, or documentation.
- Use a comma, period, colon, or restructure the sentence instead.
- This applies to all languages, including Indonesian content.

## Behavior

- Do not jump into implementation or change files unless clearly instructed to make changes. When the user's intent is ambiguous, default to providing information, doing research, and giving recommendations rather than taking action. Only proceed with edits, modifications, or implementations when the user explicitly requests them.
- Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Investigate and read relevant files BEFORE answering questions about the codebase. Never make claims about code before investigating unless you are certain of the correct answer. Give grounded and hallucination-free answers.
- If you intend to call multiple tools and there are no dependencies between the tool calls, make all independent tool calls in parallel. For example, when reading 3 files, run 3 tool calls in parallel. If some tool calls depend on previous calls to inform parameters, call them sequentially. Never use placeholders or guess missing parameters in tool calls.
- After completing a task that involves tool use, provide a quick summary of the work you have done.

## Project Structure

- Always maintain the project structure.
- Do not duplicate reusable components.
- New UI component: if reusable, place it in `src/components`. If specific to a page, place it in `src/app/{page}/components`.
- `src/lib` is for utilities and helper functions, such as database connection.
- `src/app/api` is for API routes.
- Always create API routes if they involve CRUD operations.

## Tech Stack and UI

- Always use Tailwind CSS for styling.
- Use shadcn when installing and building components. Docs: https://ui.shadcn.com/
- Always use the design skill when changing the UI.
- For the database, use Supabase.

## Security and Reliability

- If a path requires authentication or authorization, always protect it using middleware in the `proxy.ts` file.
- Always add a delay (debounce, throttle, or rate limit) for actions that can be spammed and heavily injure the system.

## Testing

- Always build tests when adding a crucial or important feature.
- Integrate tests into GitHub Actions for automated runs.

## Documentation

- Always document this app in detail in `README.md`.
- Whenever you create, update, or delete something, update the README accordingly.

# SEO Rules (Next.js App Router)

These rules are mandatory for every page. Follow them without being asked.

1. **Server Components by default.** Every page and layout is a Server Component. Never add `"use client"` to a page file. Extract only the interactive part into a small client component and import it into the server page. Push `"use client"` down the tree, never up.
2. **Static metadata on every page.** Export `metadata` typed with `Metadata` from `next`. Required fields: `title`, `description` (under 160 characters, unique per page), `keywords`, `openGraph`, `twitter`, `robots`.
3. **Dynamic metadata.** For dynamic routes use `async generateMetadata`. It must handle both success and not-found cases (not-found returns `robots: { index: false, follow: false }`). Never let it throw or return empty metadata.
4. **robots.ts.** Maintain `app/robots.ts` with explicit allow and disallow rules (for example `/admin/`, `/api/`, `/dashboard/`) and a sitemap reference.
5. **sitemap.ts.** Maintain `app/sitemap.ts`. Every indexable route must appear, with a `priority` reflecting its importance and a realistic `changeFrequency`.
6. **Canonical URLs.** Always absolute, never relative. Static pages set it directly, dynamic pages build it from params inside `generateMetadata`. Define the base URL once (`metadataBase` in the root layout or an env variable) and reuse it. Never hardcode the domain in multiple files.
7. **JSON-LD.** Only add it when the page genuinely benefits (Article, Product, FAQ, Breadcrumb, Organization, LocalBusiness). Do not add it to every page by default.
8. **Semantic HTML.** Use landmarks (`header`, `nav`, `main`, `article`, `section`, `aside`, `footer`). Exactly one `<h1>` per page, headings descend in order with no skipped levels. Use `<a>` for navigation and `<button>` for actions. Every image needs descriptive `alt` text and should use `next/image` with explicit `width` and `height`. Use proper `ul`/`ol`/`li` for lists and `table` with `th scope` for tabular data.

## Checklist Before Shipping Any Page

- [ ] Page is a Server Component
- [ ] `metadata` or `generateMetadata` exported and typed
- [ ] `generateMetadata` handles the not-found case
- [ ] Absolute canonical URL set
- [ ] Route added to `sitemap.ts` (or explicitly disallowed in `robots.ts`)
- [ ] Semantic HTML with a single `<h1>`
- [ ] All images have `alt` text

# Git Commit Policy

Agents must always commit their changes to the GitHub repository after completing a meaningful task or modification.

## Requirements

- Create a git commit after every completed feature, fix, refactor, or documentation update.
- Write clear and descriptive commit messages following conventional commit style.

Examples:

- `feat: add realtime chat support`
- `fix: resolve authentication redirect issue`
- `refactor: simplify websocket connection handler`
- `docs: update setup instructions`

## Before Committing

1. Ensure the project builds successfully.
2. Run relevant tests and linting if available.
3. Avoid committing temporary files, secrets, or debugging artifacts.
4. Do not commit `.env.example` to GitHub if it exists.
5. Review the diff before committing.

## Git Commands

```bash
git add .
git commit -m "feat: describe the change"
git push
```