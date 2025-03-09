function atobUrl(url, secret) {
  try {
    return btoa(url) === secret ? '' : url
  } catch (e) {
    return url
  }
}

window.__KB_API_VAR__ = atobUrl('__KB_API__', 'X19LQl9BUElfXw==')
window.__AI_API_VAR__ = atobUrl('__AI_API__', 'X19BSV9BUElfXw==')

// 这里的注释不能删除，用来当做占位符！--------------------------------------
