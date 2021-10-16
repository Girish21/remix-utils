const mergeHeaders = (headers: HeadersInit, value: string | null) => {
  if (!value) return headers
  if (headers instanceof Headers) {
    headers.append('Set-Cookie', value)
  } else if (Array.isArray(headers)) {
    headers.push(['Set-Cookie', value])
  } else {
    headers['Set-Cookie'] = value
  }

  return headers
}

const getFromEnv = (key: string, object = process.env): string => {
  const value = object[key]

  if (!value) throw new Error(`${key} should be in environment`)

  return value
}

const withLocale = (request: Request) => {
  const acceptedLanguages = request.headers.get('accepted-language')

  let locale: string[]
  if (!acceptedLanguages) {
    locale = ['en-US']
  } else {
    locale = acceptedLanguages.split(/[,;]/).filter(str => !str.startsWith('q'))
  }

  return locale
}

export { getFromEnv, mergeHeaders, withLocale }
