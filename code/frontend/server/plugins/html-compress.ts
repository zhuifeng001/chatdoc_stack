import zlib from 'node:zlib'
import type { ZlibOptions, BrotliOptions } from 'node:zlib'

const gzipHtmlCache = new Map<string, string | Buffer>()
const brHtmlCache = new Map<string, string | Buffer>()

export default defineNitroPlugin(nitroApp => {
  const preBodyAppendMap = new Map<string, string>()

  const formatBodyAppend = (ba: string[]) => {
    try {
      return (
        ba
          // .map(o => o.split('\n'))
          // .flat(1)
          // .map(s => s.match(/^<script.*type="application\/json".*>(.*)<\/script>$/)?.[1] || '')
          .map(o => (o as string).match(/"[^"\/\\\[\]_0-9a-z,]+"/gs) || [])
          .flat(1)
          .join(',')
      )
    } catch (error) {
      console.log('error', error)
      return ''
    }
  }

  nitroApp.hooks.hook('render:html', (htmlContext, { event }) => {
    const requestUrl = event.node.req.url
    if (!requestUrl) return

    const prevBodyAppend = preBodyAppendMap.get(requestUrl) || ''
    const currBodyAppend = formatBodyAppend(htmlContext.bodyAppend)

    event.context._response_change = currBodyAppend !== prevBodyAppend
    event.context._response_start = new Date()

    preBodyAppendMap.set(requestUrl, currBodyAppend)
  })

  nitroApp.hooks.hook('render:response', async (response, { event }) => {
    const requestURL = event.node.req.url
    const acceptedEncoding = event.node.req.headers['accept-encoding']
    console.log('process.env', process.env.NODE_ENV)
    const isProd = process.env.NODE_ENV && process.env.NODE_ENV !== 'development'
    if (isProd && requestURL && acceptedEncoding && typeof acceptedEncoding === 'string' && response.body) {
      if (/gzip/.test(acceptedEncoding)) {
        const content =
          !event.context._response_change && gzipHtmlCache.get(requestURL)
            ? gzipHtmlCache.get(requestURL)
            : await compress(Buffer.from(response.body), 'gzip')
        setHeader(event, 'Content-Encoding', 'gzip')
        setHeader(event, 'Content-Type', 'text/html;charset=utf-8')
        send(event, content)
        content && gzipHtmlCache.set(requestURL, content)
        console.log('gzip time', new Date().getTime() - event.context._response_start?.getTime())
      } else if (/br/.test(acceptedEncoding)) {
        const content =
          !event.context._response_change && brHtmlCache.get(requestURL)
            ? brHtmlCache.get(requestURL)
            : await compress(Buffer.from(response.body), 'brotliCompress')
        setHeader(event, 'Content-Encoding', 'br')
        setHeader(event, 'Content-Type', 'text/html;charset=utf-8')
        send(event, content)
        content && brHtmlCache.set(requestURL, content)
        console.log('br time', new Date().getTime() - event.context._response_start?.getTime())
      }
    }
  })
})

export type CompressionOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

/**
 * Compression core method
 * @param content
 * @param algorithm
 * @param options
 */
function compress(
  content: Buffer,
  algorithm: 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw',
  options: CompressionOptions = {}
) {
  console.log('compress')
  return new Promise<Buffer>((resolve, reject) => {
    // @ts-ignore
    zlib[algorithm](content, options, (err, result) => (err ? reject(err) : resolve(result)))
  })
}
