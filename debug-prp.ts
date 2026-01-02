import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

// Import the actual parser function
import { parsePRP } from './scripts/dod-verify/parsers/prp';

const content = readFileSync('PRP.md', 'utf-8');
const processor = unified().use(remarkParse).use(remarkGfm);
const tree = processor.parse(content);

// Find section 7
let index = 0;
let section7Index = -1;
for (const child of tree.children) {
  if (child.type === 'heading') {
    const text = child.children.map((c: any) => c.type === 'text' ? c.value : '').join('');
    if (text.match(/^7\)/)) {
      section7Index = index;
      break;
    }
  }
  index++;
}

console.log('Section 7 index:', section7Index);

// Now test the actual parser
parsePRP('PRP.md', 1).then(criteria => {
  console.log('\nParsed criteria:', criteria.length);
  console.log('First 3 criteria:', criteria.slice(0, 3).map(c => ({
    id: c.id,
    milestone: c.milestone,
    text: c.text.substring(0, 50),
  })));
});
