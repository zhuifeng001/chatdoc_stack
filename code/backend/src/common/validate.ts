import { ValidateBy, ValidationArguments, ValidationOptions, buildMessage } from 'class-validator';
import parsePhoneNumber, { isValidNumber } from 'libphonenumber-js';
import { sms } from './constant';

export function TransformDate({ value }: { value: unknown[] }) {
  return Array.isArray(value)
    ? value.map((val) => {
        if (val && typeof val === 'string') {
          return new Date(val);
        }
        return val;
      })
    : value;
}

export const IsDateOrEmpty = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return ValidateBy(
    {
      name: 'IsDateOrEmpty',
      validator: {
        validate: (value) => {
          if (value && value.toString() == 'Invalid Date') return false;
          return value instanceof Date || value === null || value === '';
        },
        defaultMessage: (arg) => `${arg.property} contain invalid Date`,
      },
    },
    validationOptions
  );
};

export const IsValidPhoneNumber = (validationOptions?: ValidationOptions): PropertyDecorator => {
  return ValidateBy(
    {
      name: 'IsValidPhoneNumber',
      validator: {
        validate: (value: string, args: ValidationArguments) => {
          const areaCode = args.object['areaCode'] || sms.area_code;
          const country = parsePhoneNumber(`${areaCode} ${value}`)?.getPossibleCountries();
          return isValidNumber(value || '', country ? country[0] : 'CN');
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be a valid phone number',
          validationOptions
        ),
      },
    },
    validationOptions
  );
};
