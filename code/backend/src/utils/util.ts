import * as crypto from 'crypto';
import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

export function generateUuid(): string {
  return uuidv4();
}

export function hashPassword(pwd: string, slot: string) {
  return crypto.createHmac('sha256', slot).update(pwd, 'utf-8').digest('hex');
}

export const pickWithoutEmpty = (obj, keys: string[]) => {
  return _.pickBy(obj, (value, key) => value !== undefined && keys.includes(key));
};

if (require.main === module) {
  console.log(hashPassword('admin', '565fb07c-d5e9-4187-9035-cd6b203692fb'));
  console.log('generateUuid()', generateUuid().replaceAll('-', ''));
}
