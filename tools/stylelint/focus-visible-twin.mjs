import stylelint from 'stylelint';

const ruleName = 'local/focus-visible-twin';

const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: (selector) =>
    `Expected a ":focus-visible" twin of "${selector}" with the same declarations`,
});

function declarations(rule) {
  const set = new Set();
  rule.walkDecls((decl) => set.add(`${decl.prop}:${decl.value}`));
  return set;
}

function insideHoverMedia(rule) {
  for (let node = rule.parent; node; node = node.parent) {
    if (node.type === 'atrule' && node.name === 'media' && /hover/.test(node.params)) return true;
  }
  return false;
}

// A twin sits outside every `hover` media query — keyboard focus must work where that query is false.
// It is matched by selector text and may carry more declarations than the hover, never fewer.
const ruleFunction = (primary) => (root, result) => {
  const valid = stylelint.utils.validateOptions(result, ruleName, { actual: primary, possible: [true] });
  if (!valid) return;
  const rules = [];
  root.walkRules((rule) => rules.push(rule));
  for (const rule of rules) {
    for (const selector of rule.selectors) {
      if (!selector.includes(':hover')) continue;
      const twin = selector.replaceAll(':hover', ':focus-visible');
      const wanted = [...declarations(rule)];
      const satisfied = rules.some((candidate) => {
        if (insideHoverMedia(candidate)) return false;
        if (!candidate.selectors.includes(twin)) return false;
        const has = declarations(candidate);
        return wanted.every((d) => has.has(d));
      });
      if (!satisfied) {
        stylelint.utils.report({ ruleName, result, node: rule, message: messages.expected(selector) });
      }
    }
  }
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

export default stylelint.createPlugin(ruleName, ruleFunction);
