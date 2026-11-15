import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it.each(['light', 'dark', null])('uses blue hour before rendering even with saved theme %s', (savedTheme) => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const classes = new Set(html.match(/<html[^>]*class="([^"]*)"/)?.[1]?.split(' ') ?? []);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (script) runInNewContext(script, {
    window: { localStorage: { getItem: () => savedTheme } },
    document: { documentElement: { classList: { add: (name: string) => classes.add(name) } } },
  });
  expect(classes.has('dark')).toBe(true);
});
