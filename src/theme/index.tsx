import * as React from 'react'
import { ActionFunction, createCookieSessionStorage, redirect } from 'remix'

enum Theme {
  DARK = 'dark',
  LIGHT = 'light'
}

type ThemeContextType = [
  Theme | null,
  React.Dispatch<React.SetStateAction<Theme | null>>
]

type ThemeProviderType = {
  ssrTheme: Theme | null
}

const themes = Object.values(Theme)

const preferDarkMQ = '(prefers-color-scheme: dark)'

const getPreferredTheme = () =>
  window.matchMedia(preferDarkMQ).matches ? Theme.DARK : Theme.LIGHT

const isTheme = (theme: unknown): theme is Theme =>
  typeof theme === 'string' && themes.includes(theme as Theme)

const initializeThemeSession = (...secrets: string[]) => {
  const { commitSession, getSession } = createCookieSessionStorage({
    cookie: {
      name: '__theme',
      secrets: [...secrets],
      sameSite: 'lax',
      path: '/',
      expires: new Date('2098-04-21'),
      httpOnly: true
    }
  })

  const getThemeSession = async (request: Request) => {
    const session = await getSession(request.headers.get('Cookie'))

    return {
      getTheme: () => {
        const theme = session.get('theme')
        return isTheme(theme) ? theme : null
      },
      setTheme: (theme: Theme) => {
        session.set('theme', theme)
      },
      commit: () => commitSession(session)
    }
  }

  const setThemeAction: ActionFunction = async ({ request }) => {
    const redirectURL = new URL(request.url).pathname
    const data = await request.json()

    if (!(data || data.theme)) {
      return redirect(redirectURL)
    }

    if (!isTheme(data.theme)) {
      return redirect(redirectURL)
    }

    const themeSession = await getThemeSession(request)
    themeSession.setTheme(data.theme)

    return redirect(redirectURL, {
      headers: { 'Set-Cookie': await themeSession.commit() }
    })
  }

  return {
    getThemeSession,
    setThemeAction
  }
}

const ThemeContext = React.createContext<ThemeContextType | null>(null)

const useTheme = () => {
  const value = React.useContext(ThemeContext)

  if (!value) {
    throw new Error('useTheme should be used inside ThemeProvider')
  }

  return value
}

const ThemeProvider: React.FunctionComponent<ThemeProviderType> = ({
  children,
  ssrTheme
}) => {
  const [theme, setTheme] = React.useState<Theme | null>(() => {
    if (ssrTheme) {
      if (themes.includes(ssrTheme)) {
        return ssrTheme
      }
      return null
    }

    if (typeof window !== 'object') {
      return null
    }

    return getPreferredTheme()
  })

  const mounted = React.useRef(false)

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const searchParams = new URLSearchParams([
      ['_data', 'routes/_actions/set-theme']
    ])

    void fetch(`/_actions/set-theme?${searchParams.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ theme }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }, [theme])

  React.useEffect(() => {
    const media = window.matchMedia(preferDarkMQ)
    const handler = () => {
      setTheme(media.matches ? Theme.DARK : Theme.LIGHT)
    }
    media.addEventListener('change', handler)

    return () => media.removeEventListener('change', handler)
  }, [])

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  )
}

const ssrThemeScript = `
  ;(() => {
    const theme = window.matchMedia(${JSON.stringify(
      preferDarkMQ
    )}).matches ? 'dark' : 'light';
    const documentCl = document.documentElement.classList;
    documentCl.add(theme);

    const meta = document.querySelector('meta[name="color-scheme"]');

    if (!meta) return;

    if (theme === 'dark') {
      meta.content = 'dark light';
    } else {
      meta.content = 'light dark';
    }
  })();
`

const SSRTheme = ({ ssrTheme }: { ssrTheme: Theme | null }) => {
  const [theme] = useTheme()

  return (
    <>
      <meta
        name="color-scheme"
        content={!theme || theme === Theme.DARK ? 'dark light' : 'light dark'}
        suppressHydrationWarning
      />
      {!ssrTheme && (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: ssrThemeScript }}
        />
      )}
    </>
  )
}

export {
  getPreferredTheme,
  initializeThemeSession,
  isTheme,
  preferDarkMQ,
  SSRTheme,
  themes,
  useTheme,
  ThemeProvider,
  Theme
}
