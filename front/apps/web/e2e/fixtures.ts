import { test as base, createBdd } from 'playwright-bdd';

// Page objects are exposed as fixtures; steps never use selectors directly.
export const test = base.extend({});

export const { Given, When, Then } = createBdd(test);
