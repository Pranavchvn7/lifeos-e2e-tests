export interface TestUser {
  name: string;
  firstName: string;
  email: string;
  password: string;
  /** True once sign-up was submitted, so the fixture knows there is an account to clean up. */
  created: boolean;
}

/** A brand-new, unique user. Emails use the reserved example.com domain, so nothing is ever sent to a real inbox. */
export function newUser(label = 'user'): TestUser {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: 'Quinn Tester',
    firstName: 'Quinn',
    email: `lifeos-e2e+${label}-${id}@example.com`,
    password: `Pw-${id}-Aa1!`,
    created: false,
  };
}
