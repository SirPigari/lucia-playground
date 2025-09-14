import { extendTheme } from '@chakra-ui/react'

const config = {
    initialColorMode: 'dark',
    useSystemColorMode: false,
}

const colors = {
    brand: {
        lightPink: '#ff66b3',
        lightAccent: '#ff66b3',
        darkPurple: '#9209B3',
        purple: '#9209B3',
    },
}

const theme = extendTheme({ config, colors })

export default theme
