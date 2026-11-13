import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// The whole front suite runs its workspaces in parallel: under that load, a page that first loads its data (account, catalog,
// queue) can take longer than the default 1 s to show what a findBy* waits for. A longer wait only delays a genuine failure.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => cleanup());
