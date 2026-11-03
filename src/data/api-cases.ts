import type { TestUser } from '../helpers/user-factory';

/** Sign-up requests the server must refuse. `undefined` removes the field from the request. */
export interface SignUpRejection {
  title: string;
  override: Partial<Record<keyof Pick<TestUser, 'name' | 'email' | 'password'>, string | undefined>>;
}

export const SIGN_UP_REJECTIONS: SignUpRejection[] = [
  { title: 'an email address without an @', override: { email: 'not-an-email' } },
  { title: 'no email address at all', override: { email: undefined } },
  { title: 'a password that is too short', override: { password: 'Ab1!' } },
  { title: 'no password at all', override: { password: undefined } },
];
