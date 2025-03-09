import { nanoid } from 'nanoid'

const randomId = (length: number = 12) => {
  return nanoid(length)
}

export { randomId }
