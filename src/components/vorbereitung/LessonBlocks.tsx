import { Card } from "@/components/ui";
import type { LessonBlock } from "@/content/vorbereitung";

/**
 * Rendu des blocs d'une leçon — dispatch sur `block.kind`, exactement comme
 * QuestionRenderer dispatche sur le type de question. Composant serveur :
 * aucune interactivité, donc aucun JavaScript envoyé au client.
 */
export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <BlockRenderer key={index} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.kind) {
    case "text":
      return (
        <div className="space-y-2.5 text-[14px] leading-relaxed">
          {block.body.split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      );

    case "list":
      return (
        <div>
          {block.title ? (
            <p className="mb-1.5 text-[13px] font-semibold">{block.title}</p>
          ) : null}
          <ul className="space-y-1.5 text-[14px] leading-relaxed">
            {block.items.map((item, index) => (
              <li key={index} className="flex gap-2.5">
                <span className="text-muted" aria-hidden="true">
                  —
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "table":
      return (
        // Un tableau large ne doit jamais élargir la page : il défile seul.
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface">
                {block.head.map((cell) => (
                  <th
                    key={cell}
                    scope="col"
                    className="border border-border px-2.5 py-1.5 text-left font-semibold"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border border-border px-2.5 py-1.5 align-top"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "examples":
      return (
        <Card muted className="divide-y divide-border">
          {block.items.map((item, index) => (
            <div key={index} className="px-3 py-2">
              <p className="text-[14px] leading-relaxed">{item.de}</p>
              {item.note ? (
                <p className="mt-0.5 text-[12px] text-muted">{item.note}</p>
              ) : null}
            </div>
          ))}
        </Card>
      );

    case "tip":
      return (
        <Card className="border-l-2 border-l-accent p-3">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
            Tipp
          </p>
          <p className="text-[14px] leading-relaxed">{block.body}</p>
        </Card>
      );

    case "pitfall":
      return (
        <Card className="border-l-2 border-l-danger p-3">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
            Typischer Fehler
          </p>
          <p className="text-[14px] leading-relaxed">{block.body}</p>
        </Card>
      );
  }
}
