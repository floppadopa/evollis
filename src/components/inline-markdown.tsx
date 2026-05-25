import { Fragment } from "react";

/**
 * Render a plain string with minimal, safe inline markdown:
 *   - **bold**  → <strong>
 *   - newlines  → <br />
 *
 * Builds React nodes (never dangerouslySetInnerHTML), so it can't inject HTML.
 * The LLM replies use `**...**` for emphasis; this turns it into real bold.
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, li) => (
    <Fragment key={li}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
        const match = /^\*\*([^*]+)\*\*$/.exec(part);
        return match ? (
          <strong key={pi}>{match[1]}</strong>
        ) : (
          <Fragment key={pi}>{part}</Fragment>
        );
      })}
      {li < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}
