import { readFileSync, writeFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import type { Root, List, ListItem } from 'mdast';
import type { Position } from '../types';

/**
 * Update a checkpoint status in prp.md
 * @param filePath - Path to prp.md file
 * @param line - Line number of the checkpoint
 * @param checked - Whether the checkpoint should be marked as checked
 */
export async function updateCheckpoint(
  filePath: string,
  line: number,
  checked: boolean
): Promise<void> {
  const content = readFileSync(filePath, 'utf-8');

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      emphasis: '_',
      rule: '-',
    });

  const tree = processor.parse(content) as Root;

  // Find and update the checkpoint at the given line
  updateCheckpointInTree(tree, line, checked);

  // Stringify back to markdown
  const result = processor.stringify(tree);

  // Write back to file
  writeFileSync(filePath, result.toString(), 'utf-8');
}

/**
 * Update multiple checkpoints in prp.md
 * @param filePath - Path to prp.md file
 * @param updates - Map of line numbers to checked status
 */
export async function updateCheckpoints(
  filePath: string,
  updates: Map<number, boolean>
): Promise<void> {
  const content = readFileSync(filePath, 'utf-8');

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      emphasis: '_',
      rule: '-',
    });

  const tree = processor.parse(content) as Root;

  // Update all checkpoints
  for (const [line, checked] of updates.entries()) {
    updateCheckpointInTree(tree, line, checked);
  }

  // Stringify back to markdown
  const result = processor.stringify(tree);

  // Write back to file
  writeFileSync(filePath, result.toString(), 'utf-8');
}

/**
 * Update a checkpoint in the AST tree
 * @param tree - Markdown AST
 * @param line - Line number of the checkpoint
 * @param checked - Whether the checkpoint should be marked as checked
 */
function updateCheckpointInTree(
  tree: Root,
  line: number,
  checked: boolean
): void {
  for (const child of tree.children) {
    if (child.type === 'list') {
      updateCheckpointInList(child as List, line, checked);
    }
  }
}

/**
 * Update a checkpoint in a list node
 * @param list - List node
 * @param line - Line number of the checkpoint
 * @param checked - Whether the checkpoint should be marked as checked
 */
function updateCheckpointInList(
  list: List,
  line: number,
  checked: boolean
): void {
  for (const item of list.children) {
    if (item.type === 'listItem') {
      const listItem = item as ListItem;

      // Check if this is the target line
      const itemLine = listItem.position?.start.line;

      if (itemLine === line) {
        // Update the checked status
        listItem.checked = checked;
        return;
      }

      // Recursively check nested lists
      for (const child of listItem.children) {
        if (child.type === 'list') {
          updateCheckpointInList(child as List, line, checked);
        }
      }
    }
  }
}

/**
 * Update all checkpoints for a specific milestone
 * @param filePath - Path to prp.md file
 * @param milestone - Milestone number (1-4)
 * @param checked - Whether checkpoints should be marked as checked
 */
export async function updateMilestoneCheckpoints(
  filePath: string,
  milestone: number,
  checked: boolean
): Promise<void> {
  const content = readFileSync(filePath, 'utf-8');

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      emphasis: '_',
      rule: '-',
    });

  const tree = processor.parse(content) as Root;

  // Find milestone section and update all checkpoints
  const milestoneSection = findMilestoneSection(tree, milestone);

  if (milestoneSection) {
    updateCheckpointsInSection(tree, milestoneSection, checked);
  }

  // Stringify back to markdown
  const result = processor.stringify(tree);

  // Write back to file
  writeFileSync(filePath, result.toString(), 'utf-8');
}

/**
 * Find the start and end indices of a milestone section
 * @param tree - Markdown AST
 * @param milestone - Milestone number
 * @returns Start and end indices, or null if not found
 */
function findMilestoneSection(
  tree: Root,
  milestone: number
): { start: number; end: number } | null {
  let startIndex = -1;

  // Find milestone heading
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];

    if (child.type === 'heading') {
      const text = getTextContent(child);

      // Match patterns like "Milestone 1", "Step 1", etc.
      const match = text.match(/(?:milestone|step)\s*(\d+)/i);

      if (match) {
        const num = parseInt(match[1], 10);
        if (num === milestone) {
          startIndex = i;
          break;
        }
      }
    }
  }

  if (startIndex === -1) {
    return null;
  }

  // Find end of section (next milestone or end of document)
  let endIndex = tree.children.length;

  for (let i = startIndex + 1; i < tree.children.length; i++) {
    const child = tree.children[i];

    if (child.type === 'heading') {
      const text = getTextContent(child);
      const match = text.match(/(?:milestone|step)\s*(\d+)/i);

      if (match) {
        endIndex = i;
        break;
      }
    }
  }

  return { start: startIndex, end: endIndex };
}

/**
 * Update all checkpoints within a section
 * @param tree - Markdown AST
 * @param section - Section start and end indices
 * @param checked - Whether checkpoints should be marked as checked
 */
function updateCheckpointsInSection(
  tree: Root,
  section: { start: number; end: number },
  checked: boolean
): void {
  for (let i = section.start; i < section.end; i++) {
    const child = tree.children[i];

    if (child.type === 'list') {
      updateAllCheckpointsInList(child as List, checked);
    }
  }
}

/**
 * Update all checkpoints in a list
 * @param list - List node
 * @param checked - Whether checkpoints should be marked as checked
 */
function updateAllCheckpointsInList(list: List, checked: boolean): void {
  for (const item of list.children) {
    if (item.type === 'listItem') {
      const listItem = item as ListItem;
      listItem.checked = checked;

      // Recursively update nested lists
      for (const child of listItem.children) {
        if (child.type === 'list') {
          updateAllCheckpointsInList(child as List, checked);
        }
      }
    }
  }
}

/**
 * Get text content from a markdown node
 * @param node - Markdown AST node
 * @returns Concatenated text content
 */
function getTextContent(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }

  if (!node || typeof node !== 'object') {
    return '';
  }

  const obj = node as Record<string, unknown>;

  if (obj.type === 'text') {
    return (obj.value as string) ?? '';
  }

  if (obj.type === 'paragraph' || obj.type === 'heading' || obj.type === 'listItem') {
    const children = (obj.children as unknown[]) ?? [];
    return children.map(getTextContent).join('');
  }

  return '';
}

/**
 * Create a backup of the prp.md file
 * @param filePath - Path to prp.md file
 * @returns Path to the backup file
 */
export function createBackup(filePath: string): string {
  const backupPath = `${filePath}.backup`;

  const content = readFileSync(filePath, 'utf-8');
  writeFileSync(backupPath, content, 'utf-8');

  return backupPath;
}

/**
 * Restore from a backup
 * @param backupPath - Path to backup file
 * @param targetPath - Path to restore to
 */
export function restoreBackup(backupPath: string, targetPath: string): void {
  const content = readFileSync(backupPath, 'utf-8');
  writeFileSync(targetPath, content, 'utf-8');
}
