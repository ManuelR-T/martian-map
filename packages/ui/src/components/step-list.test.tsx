// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { StepList, StepListItem } from './step-list';

it('keeps title selection, activity controls and row actions independent', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const select = vi.fn(); const action = vi.fn();
  function Example() {
    const [completed, setCompleted] = useState(false);
    return <StepList label="Route"><StepListItem title="Site" position={1} onSelect={select}
      description={<label><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} />Photo</label>}
      actions={<button onClick={action}>Remove</button>} /></StepList>;
  }
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Example />));
    const title = container.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
    const label = container.querySelector('label')!;
    const checkbox = container.querySelector('input')!;
    await act(async () => title.click());
    expect(select).toHaveBeenCalledTimes(1);
    expect(checkbox.checked).toBe(false);
    await act(async () => label.click());
    expect(checkbox.checked).toBe(true);
    await act(async () => checkbox.click());
    expect(checkbox.checked).toBe(false);
    expect(select).toHaveBeenCalledTimes(1);
    await act(async () => container.querySelectorAll<HTMLButtonElement>('button')[1]!.click());
    expect(action).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
    expect(checkbox.checked).toBe(false);
  } finally {
    await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals();
  }
});
