import Queue from 'queue'

export const createPromiseConCurrency = (concurrency: number = 2, onEnd?: Function) => {
  const results = []
  const queue = new Queue({ concurrency: concurrency, autostart: true, results })

  const promise = new Promise((resolve, reject) => {
    queue.addEventListener('end', (e: any) => {
      onEnd?.(e.target.results)
      resolve(e.target.results)
    })
  })
  return {
    queue,
    results,
    add: (promiseCreator: any, ...args: any) => {
      queue.push(() => {
        return promiseCreator(...args)
      })
    },
    wait: promise
  }
}
