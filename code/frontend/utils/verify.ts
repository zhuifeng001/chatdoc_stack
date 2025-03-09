import { PhoneReg, emailRegEx } from './reg'

export function isPhoneNumber(num: string | number) {
  return PhoneReg.test(String(num))
}
export function isValidEmail(email: string) {
  return emailRegEx.test(String(email))
}
