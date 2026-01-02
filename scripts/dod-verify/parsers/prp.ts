import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, List, ListItem, Paragraph, Heading } from 'mdast';
import type { DODCriterion, CheckpointItem } from '../types';

/**
 * Parse prp.md file and extract DOD criteria from section 7
 * @param filePath - Path to prp.md file
 * @param milestoneFilter - Optional milestone number to filter (1-4)
 * @returns Array of DOD criteria
 */
export async function parsePRP(
  filePath: string,
  milestoneFilter?: number
): Promise<DODCriterion[]> {
  const content = readFileSync(filePath, 'utf-8');

  const processor = unified().use(remarkParse).use(remarkGfm);

  const tree = processor.parse(content) as Root;

  // Find section 7 (Checkpoints & Definition of Done)
  const section7Index = findSectionIndex(tree, 7);

  if (section7Index === -1) {
    return []; // No section 7 found
  }

  // Extract checkpoints grouped by milestone
  const milestoneGroups = extractCheckpointsByMilestone(tree, section7Index);

  // Convert checkpoints to DOD criteria
  const criteria: DODCriterion[] = [];

  for (const [milestoneNum, checkpoints] of milestoneGroups.entries()) {
    let checkpointCounter = 0;

    for (const checkpoint of checkpoints) {
      const category = inferCategory(checkpoint.text);

      checkpointCounter++;
      const criterionId = `m${milestoneNum}-c${String(checkpointCounter).padStart(2, '0')}`;

      const criterion: DODCriterion = {
        id: criterionId,
        milestone: milestoneNum,
        text: checkpoint.text,
        category,
        status: checkpoint.checked ? 'passed' : 'pending',
        line: checkpoint.line,
        position: checkpoint.position,
      };

      // Apply milestone filter if specified
      if (!milestoneFilter || criterion.milestone === milestoneFilter) {
        criteria.push(criterion);
      }
    }
  }

  return criteria;
}

/**
 * Find the index of a specific section in the markdown tree
 * @param tree - Markdown AST
 * @param sectionNumber - Section number to find
 * @returns Index of the section heading, or -1 if not found
 */
function findSectionIndex(tree: Root, sectionNumber: number): number {
  let index = 0;

  for (const child of tree.children) {
    if (child.type === 'heading') {
      const heading = child as Heading;
      const text = getTextContent(heading);

      // Match patterns like "7) Checkpoints" or "## 7) Checkpoints"
      const match = text.match(/^(\d+)\)/);

      if (match) {
        const num = parseInt(match[1], 10);
        if (num === sectionNumber) {
          return index;
        }
      }
    }
    index++;
  }

  return -1;
}

/**
 * Extract all checklist items from a section
 * @param tree - Markdown AST
 * @param startIndex - Starting index in the tree
 * @returns Array of checkpoint items
 */
function extractCheckpoints(
  tree: Root,
  startIndex: number
): CheckpointItem[] {
  const checkpoints: CheckpointItem[] = [];
  let currentLine = 1;

  for (let i = startIndex; i < tree.children.length; i++) {
    const child = tree.children[i];

    // Stop at next major section (heading level 1 or 2 with number)
    if (child.type === 'heading') {
      const heading = child as Heading;
      const text = getTextContent(heading);

      if (/^(\d+)\)/.test(text) && heading.depth <= 2) {
        break;
      }
    }

    // Extract checklist items
    if (child.type === 'list') {
      const list = child as List;
      const items = extractCheckpointsFromList(list, currentLine);
      checkpoints.push(...items);
    }

    // Update line counter
    if (child.position) {
      currentLine = child.position.end.line!;
    }
  }

  return checkpoints;
}

/**
 * Extract checkpoints grouped by milestone from section 7
 * @param tree - Markdown AST
 * @param startIndex - Starting index in the tree (the section 7 heading)
 * @returns Map of milestone number to checkpoint items
 */
function extractCheckpointsByMilestone(
  tree: Root,
  startIndex: number
): Map<number, CheckpointItem[]> {
  const milestoneGroups = new Map<number, CheckpointItem[]>();
  let currentMilestone = 0;
  let currentLine = 1;

  // Start AFTER the section 7 heading
  for (let i = startIndex + 1; i < tree.children.length; i++) {
    const child = tree.children[i];

    // Stop at next major section (heading level 1 or 2 with number)
    if (child.type === 'heading') {
      const heading = child as Heading;
      const text = getTextContent(heading);

      if (process.env.DOD_DEBUG) {
        console.error(`[DOD] Heading at ${i}: depth=${heading.depth} text="${text}"`);
      }

      if (/^(\d+)\)/.test(text) && heading.depth <= 2) {
        if (process.env.DOD_DEBUG) {
          console.error(`[DOD] Stopping at section ${text}`);
        }
        break;
      }

      // Detect milestone headings (depth 3: "Milestone N:")
      // Format: "Milestone 1: Core Infrastructure"
      const milestoneMatch = text.match(/^milestone\s+(\d+):/i);
      if (process.env.DOD_DEBUG) {
        console.error(`[DOD] Milestone match for "${text}":`, milestoneMatch);
      }
      if (milestoneMatch && heading.depth === 3) {
        currentMilestone = parseInt(milestoneMatch[1], 10);
        milestoneGroups.set(currentMilestone, []);
        if (process.env.DOD_DEBUG) {
          console.error(`[DOD] >>> Found Milestone ${currentMilestone} at index ${i}: "${text}"`);
        }
        continue;
      }
    }

    // Only collect checkpoints if we're in a milestone section
    if (currentMilestone === 0) {
      continue;
    }

    // Extract checklist items
    if (child.type === 'list') {
      const list = child as List;
      const items = extractCheckpointsFromList(list, currentLine);
      if (process.env.DOD_DEBUG) {
        console.error(`[DOD] Found ${items.length} checkpoints for milestone ${currentMilestone}`);
      }
      const existing = milestoneGroups.get(currentMilestone) ?? [];
      milestoneGroups.set(currentMilestone, [...existing, ...items]);
    }

    // Update line counter
    if (child.position) {
      currentLine = child.position.end.line!;
    }
  }

  if (process.env.DOD_DEBUG) {
    console.error(`[DOD] Total milestones found: ${milestoneGroups.size}`);
  }

  return milestoneGroups;
}

/**
 * Extract checkpoints from a list node
 * @param list - List node from AST
 * @param startLine - Starting line number
 * @returns Array of checkpoint items
 */
function extractCheckpointsFromList(
  list: List,
  startLine: number
): CheckpointItem[] {
  const checkpoints: CheckpointItem[] = [];

  for (const item of list.children) {
    if (item.type === 'listItem') {
      const listItem = item as ListItem;

      // Check if this is a checklist item [ ] or [x]
      const firstChild = listItem.children[0];
      const isChecked = listItem.checked ?? false;

      if (firstChild) {
        const text = getTextContent(listItem);

        checkpoints.push({
          text,
          checked: isChecked,
          line: firstChild.position?.start.line ?? startLine,
          position: {
            start: {
              line: firstChild.position?.start.line ?? startLine,
              column: firstChild.position?.start.column ?? 0,
            },
            end: {
              line: firstChild.position?.end.line ?? startLine,
              column: firstChild.position?.end.column ?? 0,
            },
          },
        });
      }
    }
  }

  return checkpoints;
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
 * Infer DOD category from checkpoint text
 * @param text - Checkpoint text
 * @returns Inferred category
 */
function inferCategory(text: string): DODCriterion['category'] {
  const lower = text.toLowerCase();

  if (lower.includes('test') || lower.includes('coverage') || lower.includes('e2e')) {
    return 'tests';
  }

  if (lower.includes('typescript') || lower.includes('type') || lower.includes('compil')) {
    return 'typescript';
  }

  if (lower.includes('lint') || lower.includes('format') || lower.includes('biome') || lower.includes('eslint')) {
    return 'lint';
  }

  if (lower.includes('secret') || lower.includes('security') || lower.includes('rate limit') || lower.includes('input valid')) {
    return 'security';
  }

  if (lower.includes('doc') || lower.includes('readme') || lower.includes('api spec')) {
    return 'documentation';
  }

  return 'manual';
}

/**
 * Filter DOD criteria by milestone number
 * @param criteria - All DOD criteria
 * @param milestone - Milestone number (1-4)
 * @returns Filtered criteria
 */
export function filterByMilestone(
  criteria: DODCriterion[],
  milestone: number
): DODCriterion[] {
  return criteria.filter((c) => c.milestone === milestone);
}

/**
 * Group criteria by milestone
 * @param criteria - All DOD criteria
 * @returns Map of milestone number to criteria
 */
export function groupByMilestone(
  criteria: DODCriterion[]
): Map<number, DODCriterion[]> {
  const groups = new Map<number, DODCriterion[]>();

  for (const criterion of criteria) {
    const existing = groups.get(criterion.milestone) ?? [];
    existing.push(criterion);
    groups.set(criterion.milestone, existing);
  }

  return groups;
}
