import { type Ref, inject, reactive, toRefs } from 'vue'

export const useAssign = (objectArray: Array<{ [x: string]: any }>): { [x: string]: any } => {
  return Object.assign({}, ...objectArray)
}

type ResInject<T, Keys extends string> = T extends Record<any, any> ? T : { [K in Keys]: any }

type ResRefInject<T, Keys extends string> = T extends Record<any, any> ? T : { [K in Keys]: Ref<any> }

/**
 * 使用方式
 * const { stat } = useInjectToRefs(['stat'] as const)
 * stat.xxx
 */
export const useInject = <T = boolean, Keys extends string = string>(fields: readonly Keys[], defaultValues?: ResInject<T, Keys>): ResInject<T, Keys> => {
  return useAssign(fields.map(name => ({ [name]: inject<any>(name, defaultValues?.[name]) }))) as ResInject<T, Keys>
}

/**
 * 使用方式
 * const { stat } = useInjectToRefs(['stat'] as const)
 * stat.value.xxx
 */
export const useInjectToRefs = <T = boolean, Keys extends string = string>(fields: readonly Keys[]): ResRefInject<T, Keys> => {
  const reactiveInject = reactive(useInject(fields))
  return toRefs(reactiveInject) as ResRefInject<T, Keys>
}
