import { Fragment } from 'react';
import type { RichTextNode } from '@/shared/types/domain';

/**
 * Restricted rich-text renderer.
 *
 * SECURITY: we NEVER render provider-supplied HTML. Content arrives as a small,
 * validated node tree (paragraph/heading/list/quote with bold/italic marks) and
 * is rendered to safe React elements. This structurally prevents XSS from
 * ATS/spreadsheet content — there is no `dangerouslySetInnerHTML` anywhere.
 */
function renderMarks(text: string, marks?: Array<'bold' | 'italic'>) {
  let node: React.ReactNode = text;
  if (marks?.includes('bold')) node = <strong>{node}</strong>;
  if (marks?.includes('italic')) node = <em>{node}</em>;
  return node;
}

function RichNode({ node }: { node: RichTextNode }) {
  switch (node.type) {
    case 'heading': {
      const level = node.level ?? 3;
      const Tag = (`h${level}` as 'h2' | 'h3' | 'h4');
      return <Tag className="mt-4 text-xl font-semibold">{renderMarks(node.text ?? '', node.marks)}</Tag>;
    }
    case 'quote':
      return (
        <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground">
          {renderMarks(node.text ?? '', node.marks)}
        </blockquote>
      );
    case 'list': {
      const ListTag = node.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={node.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}>
          {(node.children ?? []).map((child, i) => (
            <li key={i}>{renderMarks(child.text ?? '', child.marks)}</li>
          ))}
        </ListTag>
      );
    }
    case 'list_item':
      return <li>{renderMarks(node.text ?? '', node.marks)}</li>;
    case 'paragraph':
    default:
      return <p>{renderMarks(node.text ?? '', node.marks)}</p>;
  }
}

export function RichText({ nodes }: { nodes: RichTextNode[] }) {
  return (
    <div className="flex flex-col gap-3 text-muted-foreground">
      {nodes.map((node, index) => (
        <Fragment key={index}>
          <RichNode node={node} />
        </Fragment>
      ))}
    </div>
  );
}
