import { Logger } from '@nestjs/common';

export const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const nameRegExp = (
  name: string,
  { ellipsis, suffix }: { ellipsis?: boolean; suffix?: boolean } = {}
) => {
  let pattern = '^' + escapeRegExp(name);
  if (ellipsis) {
    pattern += '([\\.]{3})?';
  }
  pattern += '(\\([0-9]+\\))?';
  if (suffix) {
    pattern += '\\.[a-zA-Z]+';
  }
  return pattern + '$';
};

export const getValidName = <T>(
  sameList: T[],
  {
    field,
    originName,
    pattern,
    ellipsis,
  }: { field: string; originName: string; pattern: string; ellipsis?: boolean }
) => {
  try {
    let number = sameList.length;
    if (number) {
      const matchList = sameList.map(
        (item) =>
          item[field]
            .match(new RegExp(pattern))
            ?.[typeof ellipsis === 'boolean' ? 2 : 1]?.match(/\(([0-9]+)\)/)?.[1]
      );
      const numberSet = new Set(matchList.map((item) => (item ? Number(item) : 0)));
      if (!numberSet.size || !numberSet.has(0)) {
        number = 0;
      } else {
        let i = 2;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (!numberSet.has(i)) {
            number = i - 1;
            break;
          }
          i++;
        }
      }
    }
    if (ellipsis) {
      return originName + '...' + (number ? `(${number + 1})` : '');
    }
    return number ? originName + `(${number + 1})` : originName;
  } catch (error) {
    Logger.error(error, `判断是否重名[${originName}]`);
    return originName;
  }
};
