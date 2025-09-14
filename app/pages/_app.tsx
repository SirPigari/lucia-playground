import type { AppProps } from 'next/app'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import theme from '../src/theme'

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ChakraProvider theme={theme}>
            <ColorModeScript initialColorMode={theme.config?.initialColorMode} />
            <Component {...pageProps} />
        </ChakraProvider>
    )
}
