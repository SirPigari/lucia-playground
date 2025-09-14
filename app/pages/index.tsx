import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import {
    Box,
    Button,
    Heading,
    HStack,
    VStack,
    Spinner,
    Text,
    useToast,
    IconButton,
    Container,
    Link,
    useColorMode,
    useColorModeValue,
    Flex,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Checkbox,
    Divider,
    UnorderedList,
    ListItem,
    Image,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    useDisclosure,
} from '@chakra-ui/react';
import { Sun, Moon, Github, Package as PackageIcon, Box as BoxIcon, Cpu as CpuIcon, FileText as FileTextIcon, Play, Trash2, X } from 'lucide-react';
import AnsiUp from 'ansi_up';
import dynamic from 'next/dynamic';
import NextImage from 'next/image';

declare global {
    interface Window {
        __lucia_wasm_inited?: boolean;
    }
}

const CodeEditor = dynamic(() => import('../components/CodeEditor'), { ssr: false });

const STD_MACROS = `
// std/macros.lc
// This file contains macros for the Lucia programming language's standard library.
#ifndef LUCIA_STD_MACROS
#define LUCIA_STD_MACROS

import collections as _collections
import config as _config
import time as _time


// macro definitions can have a additional '!' after the name but its optional
// i added it because i was forgeting if it was there or not
//           V - here could be a '!'
#macro assert($cond, $msg=("Assertion failed")):
    if (!$cond):
        throw $msg from "AssertionError"
    end
#endmacro

// in macro f-strings you can use the $arg$ for the value of the arg
// gets replaced by {arg_value} in the string
// also the string MUST be f-string, otherwise it will not work
#macro assert_eq($a, $b, $msg=(f"Values are not equal, expected: $b$, got: $a$")):
    if (($a) != ($b)):
        throw $msg from "AssertionError"
    end
#endmacro

#macro assert_approx_eq($a, $b, $epsilon=(0.000001), $msg=(f"Values are not approximately equal, expected: $b$, got: $a$ (within $epsilon$)")):
    if ((|($a) - ($b)|) > $epsilon):
        throw $msg from "AssertionError"
    end
#endmacro


#macro assert_ne($a, $b, $msg=(f"Values are equal but should not be, expected: $b$, got: $a$")):
    if (($a) == ($b)):
        throw $msg from "AssertionError"
    end
#endmacro

#macro assert_err($expr, $msg=("Expected an error but got success")):
    // smallest assert err macro i could come up with
    // you could argue that the before ones were more readable, but this is the smallest
    //               | --------------------- wrapping into a group
    //               V                      V -- using '? or' to check if error, on error return the error tuple
    result: ?tuple = \\ ($expr) return null \\? or _err
    // if result is null (which can be only if it doesnt fail) then throw the error
    if (result.is_null()) then throw $msg from "AssertionError"
    // forget and return the error tuple
    forget result
#endmacro

#macro assert_type($value, $type_, $msg=(f"Type mismatch")):
    // innit?
    if ($value isn't $type_):
        throw $msg from "TypeError"
    end
#endmacro

#macro unreachable($msg=("Entered unreachable code")):
    throw $msg from "UnreachableError"
#endmacro

#macro todo($msg=("Not implemented yet")):
    throw $msg from "NotImplemented"
#endmacro

#macro dbg($value...):
    // when a variadic arg in macros is used, the value of it isnt a tuple or a list, its just the values separated by commas
    // its on the macro to decide the type
    // here we use a list (denoted by the [])
    values: list = [$value]
    mutable output: str = ""  // output builder 
    for ((i, n) in values.enumerate()):
        // $!value means the stringified version of the value tokens
        // split by backticks to get the identifiers (backticks aren't used in lucia)
        output += $!;value.split(";")[i].trim() + " = " + _collections.format_value(n).trim() + "\n\r"
    end
    forget values
    print(output, end = "")
    null  // otherwise it will return the last value (values)
#endmacro

#macro dbglog($value):
    styledprint($value, fg_color = _config.color_scheme["debug"])
#endmacro

// TODO: Fix apollo time in time module (src/env/libs/time/__init__.rs)
#macro time_it($expr):
    scope time_it_scope(_time):
        start_time: int = _time.current_apollo_time()
        result: any = ($expr)
        end_time: int = _time.current_apollo_time()
        elapsed: int = end_time - start_time
        return ((result, elapsed))
    end
#endmacro

#macro stringify($value):
    if ($value is str):
        return $value
    else:
        return _collections.format_value($value)
    end
#endmacro

#macro stringify_tokens($tokens):
    return $!tokens
#endmacro

#macro range($a, $b = (null), $step = (1)):
    return _collections.range($a, $b, $step)
#endmacro

// return null
null

#endif
`;

export default function Home() {
    const [outputHtml, setOutputHtml] = useState('');
    const [code, setCode] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                const saved = window.localStorage.getItem('lucia_playground_code');
                if (saved) return saved;
            }
        } catch (e) { }
        return `// write some lucia code here uwu\nname := "Lucia"\nprint(f"hello from {name}")`;
    });
    const outputRef = useRef('');
    const wasmRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('Running WASM warmup');
    const [versionMsg, setVersionMsg] = useState('');
    const [wasmLoadFailed, setWasmLoadFailed] = useState(false);
    const luciaVersion = versionMsg && versionMsg.startsWith('Running Lucia-') ? versionMsg.replace('Running Lucia-', '') : undefined;
    const toast = useToast();
    const { colorMode, toggleColorMode } = useColorMode();
    const accentLight = useColorModeValue('#ff66b3', '#9209B3');
    const bgOutput = useColorModeValue('gray.50', 'gray.900');
    const textColor = useColorModeValue('gray.800', 'gray.100');

    // If the user hasn't explicitly chosen a color mode (no stored key),
    // default to the device/browser preference (prefers-color-scheme).
    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            const storageKey = 'chakra-ui-color-mode';
            const stored = window.localStorage.getItem(storageKey);
            if (stored === null) {
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                // toggleColorMode flips the current mode; only call when mismatch
                if ((prefersDark && colorMode !== 'dark') || (!prefersDark && colorMode !== 'light')) {
                    toggleColorMode();
                }
            }
        } catch (e) {
            // ignore
        }
        // run only once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast]);
    const [fontScale, setFontScale] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                const s = window.localStorage.getItem('lucia_font_scale');
                if (s) return Math.max(0.6, Math.min(2, Number(s)));
            }
        } catch (e) { }
        return 1;
    });
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [isClearOpen, setIsClearOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                return window.localStorage.getItem('lucia_skip_clear_confirm') === 'true';
            }
        } catch (e) { }
        return false;
    });
    const cancelRef = React.useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        (async () => {
            const candidates = ['/lucia-playground/pkg/lucia_wasm.js', '/lucia-playground/pkg/lucia_wasm.js'];
            let lastErr: any = null;
            for (const path of candidates) {
                try {
                    const url = path.startsWith('http') ? path : window.location.origin + path;
                    const wasmModule = await import(/* webpackIgnore: true */ url);
                    if (typeof wasmModule.default === 'function') await wasmModule.default();
                    wasmRef.current = wasmModule;

                    try {
                        if (wasmModule.get_lucia_version) {
                            const ver = wasmModule.get_lucia_version();
                            setVersionMsg(`Running Lucia-${ver}`);
                        } else if (wasmModule.get_lucia_version_async) {
                            const ver = await wasmModule.get_lucia_version_async();
                            setVersionMsg(`Running Lucia-${ver}`);
                        }
                        setOutputHtml(renderAnsi(outputRef.current));
                    } catch (e) { }

                    if (!window.__lucia_wasm_inited) {
                        try {
                            const cfgTemp = wasmModule.get_default_config();
                            await wasmModule.run_code_wasm('print("hello world") for i in [0..10]: print(i) end import random print(f"Our lucky number for this session is: {random.randint(1, 100)}")', cfgTemp);
                            console.debug('WASM warmup completed and output binding restored (warmup output discarded).');
                            window.__lucia_wasm_inited = true;
                        } catch (e) { }
                    }

                    if (typeof wasmModule.set_print_callback === 'function') {
                        wasmModule.set_print_callback((msg: string) => {
                            outputRef.current += msg;
                            setOutputHtml(renderAnsi(outputRef.current));
                        });
                        setOutputHtml(renderAnsi(outputRef.current));
                    }

                    if (typeof wasmModule.set_clear_callback === 'function') {
                        wasmModule.set_clear_callback(() => {
                            outputRef.current = '';
                            setOutputHtml('');
                        });
                    }

                    setIsReady(true);
                    setLoadingMsg('WASM ready');
                    return;
                } catch (err) {
                    lastErr = err;
                }
            }
            setOutputHtml((prev) => prev + 'WASM load/init error: ' + String(lastErr) + '\n');
            setLoadingMsg('WASM load failed');
            setWasmLoadFailed(true);
            toast({ title: 'WASM Load Failed', description: String(lastErr), status: 'error', isClosable: true });
        })();
    }, [toast]);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined') window.localStorage.setItem('lucia_font_scale', String(fontScale));
        } catch (e) { }
    }, [fontScale]);

    useEffect(() => {
        function onWheel(e: WheelEvent) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.05 : -0.05;
                setFontScale((s) => Math.max(0.6, Math.min(2, +(s + delta).toFixed(2))));
            }
        }

        let lastDist: number | null = null;
        function touchDistance(a: Touch, b: Touch) {
            const dx = a.clientX - b.clientX;
            const dy = a.clientY - b.clientY;
            return Math.hypot(dx, dy);
        }

        function onTouchStart(e: TouchEvent) {
            if (e.touches.length === 2) {
                lastDist = touchDistance(e.touches[0], e.touches[1]);
            }
        }
        function onTouchMove(e: TouchEvent) {
            if (e.touches.length === 2 && lastDist != null) {
                const d = touchDistance(e.touches[0], e.touches[1]);
                const diff = (d - lastDist) / 200;
                if (Math.abs(diff) > 0.01) {
                    setFontScale((s) => Math.max(0.6, Math.min(2, +(s + diff).toFixed(2))));
                    lastDist = d;
                }
            }
        }
        function onTouchEnd() {
            lastDist = null;
        }

        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    const run = React.useCallback(async () => {
        outputRef.current = '';
        setOutputHtml('');
        if (!wasmRef.current) {
            setOutputHtml('WASM not loaded yet\n');
            return;
        }
        try {
            const cfg = wasmRef.current.get_default_config();
            cfg.supports_color = true;
            cfg.type_checker.enabled = true;
            let final_code = STD_MACROS.replace(/\r\n/g, "\n") + '\n\n\n' + code.replace(/\r\n/g, "\n");
            await wasmRef.current.run_code_wasm(final_code, cfg);
        } catch (e) {
            setOutputHtml((o) => o + 'Error: ' + String(e) + '\n');
        }
    }, [code]);

    function clear() {
        outputRef.current = '';
        setOutputHtml('');
        if (wasmRef.current && typeof wasmRef.current.set_clear_callback === 'function') {
            wasmRef.current.set_clear_callback();
        }
    }

    React.useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const meta = isMac ? e.metaKey : e.ctrlKey;
            if (meta && e.key.toLowerCase() === 's') {
                e.preventDefault();
            }
            if (meta && e.key === 'Enter') {
                e.preventDefault();
                run();
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [code, isReady, run]);

    return (
        <Flex>
            <Head>
                <title>Lucia Playground</title>
            </Head>
            <Box display={{ base: 'none', md: 'block' }} w="260px" p={6} minH="100vh" bgGradient={useColorModeValue('linear(to-b, pink.50, white)', 'linear(to-b, gray.900, #0b0226)')} color={textColor} borderRightWidth={useColorModeValue('1px', '0')}>
                <VStack align="start" spacing={6}>
                    <HStack spacing={3} align="center">
                        <Box p={0} borderRadius="md" overflow="hidden" boxSize="40px">
                            <NextImage src="/icon.svg" alt="Lucia" width={40} height={40} />
                        </Box>
                        <VStack align="start" spacing={0}>
                            <Heading size="sm">Lucia</Heading>
                            <Text fontSize="xs">WASM Playground</Text>
                        </VStack>
                    </HStack>

                    <Box mt={4} fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                        <Text mb={2} fontSize="xs" fontWeight={600}>About Lucia</Text>
                        <Box p={4} rounded="md" bg={useColorModeValue('gray.50', 'gray.800')}>
                            <HStack align="start" spacing={3}>
                                <VStack align="start" spacing={0}>
                                    <Heading size="sm">Lucia</Heading>
                                    <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>Lucia-{luciaVersion ?? '...'} by <Link href="https://github.com/SirPigari/lucia-rust" isExternal color="teal.400">SirPigari</Link></Text>
                                </VStack>
                            </HStack>

                            <Text fontSize="sm" mt={3} color={useColorModeValue('gray.700', 'gray.300')}>
                                Lucia is a lightweight, expressive scripting language with Python inspired syntax, implemented in Rust for performance and safety. It includes static typing, an integrated package manager (<Link href="https://github.com/SirPigari/lym" isExternal color="teal.400">Lym</Link>), and is released under GPLv3. This playground runs a smaller version built using wasm-bindgen for in-browser experimentation - some native features are omitted.
                            </Text>

                            <Divider my={3} />

                            <Text fontSize="sm" fontWeight="600">Status</Text>
                            <VStack spacing={2} mt={2} align="start">
                                <Link href="https://github.com/SirPigari/lucia-rust/actions/workflows/test-linux.yml" isExternal>
                                    <Image src="https://github.com/SirPigari/lucia-rust/actions/workflows/test-linux.yml/badge.svg?branch=main" alt="CI" h={6} maxH="14px" objectFit="contain" />
                                </Link>
                                <Link href="https://github.com/SirPigari/lucia-rust/actions/workflows/build-wasm.yml" isExternal>
                                    <Image src="https://github.com/SirPigari/lucia-rust/actions/workflows/build-wasm.yml/badge.svg?branch=main" alt="WASM Build" h={6} maxH="14px" objectFit="contain" />
                                </Link>
                            </VStack>

                            <Divider my={3} />
                        </Box>
                    </Box>

                    <Box mt={4} w="full">
                        <Accordion allowToggle>
                            <AccordionItem>
                                <AccordionButton px={0}>
                                    <Box flex="1" textAlign="left" fontSize="xs" fontWeight={600} color={useColorModeValue('gray.700', 'gray.300')}>Notes</Box>
                                    <AccordionIcon />
                                </AccordionButton>
                                <AccordionPanel px={0} pt={2} pb={4} fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                                    <UnorderedList spacing={1} ml={4}>
                                        <ListItem>This playground persists your code and font scale to localStorage.</ListItem>
                                        <ListItem>The wasm build runs entirely in the browser; some features from the native runtime are omitted for size and security. Omitted examples include:</ListItem>
                                        <UnorderedList spacing={1} ml={6}>
                                            <ListItem>Filesystem APIs / direct file access</ListItem>
                                            <ListItem>Native extensions / FFI (loading platform libraries)</ListItem>
                                            <ListItem>Process spawning and shell access</ListItem>
                                            <ListItem>Background native threads (OS threads) and certain concurrency primitives</ListItem>
                                            <ListItem>Access to raw file descriptors and platform-specific system calls</ListItem>
                                            <ListItem>Standard include files (like <code>std/macros</code>)</ListItem>
                                        </UnorderedList>
                                        <ListItem>For the full feature set and documentation, see the repository and run native builds locally.</ListItem>
                                    </UnorderedList>
                                </AccordionPanel>
                            </AccordionItem>
                        </Accordion>
                    </Box>
                </VStack>
            </Box>

            <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerHeader>
                        <HStack spacing={3} align="center">
                            <Box p={0} borderRadius="md" overflow="hidden" boxSize="32px">
                                <NextImage src="/icon.svg" alt="Lucia" width={32} height={32} />
                            </Box>
                            <VStack align="start" spacing={0}>
                                <Heading size="xs">Lucia</Heading>
                                <Text fontSize="xs">WASM Playground</Text>
                            </VStack>
                        </HStack>
                    </DrawerHeader>
                    <DrawerBody>
                        <VStack align="start" spacing={6} w="full">
                            <Box fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')} w="full">
                                <Text mb={2} fontSize="xs" fontWeight={600}>About Lucia</Text>
                                <Box p={4} rounded="md" bg={useColorModeValue('gray.50', 'gray.800')}>
                                    <HStack align="start" spacing={3}>
                                        <VStack align="start" spacing={0}>
                                            <Heading size="sm">Lucia</Heading>
                                            <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>Lucia-{luciaVersion ?? '...'} by <Link href="https://github.com/SirPigari/lucia-rust" isExternal color="teal.400">SirPigari</Link></Text>
                                        </VStack>
                                    </HStack>

                                    <Text fontSize="sm" mt={3} color={useColorModeValue('gray.700', 'gray.300')}>
                                        Lucia is a lightweight, expressive scripting language with Python inspired syntax, implemented in Rust for performance and safety. It includes static typing, an integrated package manager (<Link href="https://github.com/SirPigari/lym" isExternal color="teal.400">Lym</Link>), and is released under GPLv3. This playground runs a smaller version built using wasm-bindgen for in-browser experimentation - some native features are omitted.
                                    </Text>

                                    <Divider my={3} />

                                    <Text fontSize="sm" fontWeight="600">Status</Text>
                                    <VStack spacing={2} mt={2} align="start">
                                        <Link href="https://github.com/SirPigari/lucia-rust/actions/workflows/test-linux.yml" isExternal>
                                            <Image src="https://github.com/SirPigari/lucia-rust/actions/workflows/test-linux.yml/badge.svg?branch=main" alt="CI" h={6} maxH="14px" objectFit="contain" />
                                        </Link>
                                        <Link href="https://github.com/SirPigari/lucia-rust/actions/workflows/build-wasm.yml" isExternal>
                                            <Image src="https://github.com/SirPigari/lucia-rust/actions/workflows/build-wasm.yml/badge.svg?branch=main" alt="WASM Build" h={6} maxH="14px" objectFit="contain" />
                                        </Link>
                                    </VStack>
                                </Box>
                            </Box>

                            <VStack spacing={3} align="start" w="full">
                                <Link href="https://github.com/SirPigari/lucia-rust" isExternal _hover={{ textDecoration: 'none' }} color={accentLight} onClick={onClose}>
                                    <HStack>
                                        <PackageIcon color={accentLight} size={18} />
                                        <Text>Lucia (repo)</Text>
                                    </HStack>
                                </Link>
                                <Link href="https://webassembly.org/" isExternal _hover={{ textDecoration: 'none' }} color={accentLight} onClick={onClose}>
                                    <HStack>
                                        <BoxIcon color={accentLight} size={18} />
                                        <Text>WASM</Text>
                                    </HStack>
                                </Link>
                                <Link href="https://www.rust-lang.org/" isExternal _hover={{ textDecoration: 'none' }} color={accentLight} onClick={onClose}>
                                    <HStack>
                                        <CpuIcon color={accentLight} size={18} />
                                        <Text>Rust</Text>
                                    </HStack>
                                </Link>
                                <Link href="https://opensource.org/licenses/GPL-3.0" isExternal _hover={{ textDecoration: 'none' }} color={accentLight} onClick={onClose}>
                                    <HStack>
                                        <FileTextIcon color={accentLight} size={18} />
                                        <Text>GPLv3</Text>
                                    </HStack>
                                </Link>
                            </VStack>

                            <Box mt={4} fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')} w="full">
                                <Text mb={2} fontSize="xs" fontWeight={600}>Notes</Text>
                                <UnorderedList spacing={1} ml={4} color={useColorModeValue('gray.600', 'gray.400')}>
                                    <ListItem>This playground persists your code and font scale to localStorage.</ListItem>
                                    <ListItem>The wasm build runs entirely in the browser; some features from the native runtime are omitted for size and security. Omitted examples include:</ListItem>
                                    <UnorderedList spacing={1} ml={6}>
                                        <ListItem>Filesystem APIs / direct file access</ListItem>
                                        <ListItem>Native extensions / FFI (loading platform libraries)</ListItem>
                                        <ListItem>Process spawning and shell access</ListItem>
                                        <ListItem>Background native threads (OS threads) and certain concurrency primitives</ListItem>
                                        <ListItem>Access to raw file descriptors and platform-specific system calls</ListItem>
                                        <ListItem>Standard include files (like <code>std/macros</code>)</ListItem>
                                    </UnorderedList>
                                    <ListItem>For the full feature set and documentation, see the repository and run native builds locally.</ListItem>
                                </UnorderedList>
                            </Box>
                        </VStack>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
            <Container maxW="container.lg" py={8}>
                <VStack spacing={6} align="stretch">
                    <HStack justify="space-between">
                        <HStack>
                            <IconButton display={{ base: 'inline-flex', md: 'none' }} aria-label="Open sidebar" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>} onClick={onOpen} />
                            <Heading size="lg">Lucia Playground</Heading>
                        </HStack>
                        <HStack>
                            {!isReady ? (
                                <HStack>
                                    <Spinner />
                                    <Text color={wasmLoadFailed ? 'red.400' : undefined}>{loadingMsg}</Text>
                                </HStack>
                            ) : (
                                <Text color="green.400">{loadingMsg}</Text>
                            )}
                            <HStack spacing={2} ml={4}>
                                <IconButton aria-label="Toggle theme" icon={colorMode === 'dark' ? <Sun /> : <Moon />} onClick={toggleColorMode} />
                                <IconButton as={Link} href="https://github.com/SirPigari/lucia-rust" aria-label="GitHub" icon={<Github />} />
                            </HStack>
                        </HStack>
                    </HStack>

                    <Box>
                        <Text mb={2}>Code</Text>
                        <CodeEditor
                            value={code}
                            fontSize={Math.round(13 * fontScale)}
                            onChange={(v) => {
                                setCode(v);
                                try {
                                    if (typeof window !== 'undefined') window.localStorage.setItem('lucia_playground_code', v);
                                } catch (e) { }
                            }}
                        />
                        <HStack mt={2} spacing={2}>
                            <Button leftIcon={<Play />} colorScheme="blue" onClick={run} isDisabled={!isReady}>
                                Run
                            </Button>
                            <IconButton aria-label="Clear output" icon={<Trash2 />} onClick={clear} />
                            <IconButton aria-label="Clear code" size="sm" variant="ghost" icon={<X />} onClick={() => {
                                if (dontShowAgain) {
                                    setCode('');
                                    try { if (typeof window !== 'undefined') window.localStorage.removeItem('lucia_playground_code'); } catch (e) { }
                                } else {
                                    setIsClearOpen(true);
                                }
                            }} />
                        </HStack>

                        <AlertDialog isOpen={isClearOpen} leastDestructiveRef={cancelRef} onClose={() => setIsClearOpen(false)}>
                            <AlertDialogOverlay>
                                <AlertDialogContent>
                                    <AlertDialogHeader fontSize="lg" fontWeight="bold">Clear code</AlertDialogHeader>

                                    <AlertDialogBody>
                                        Are you sure you want to clear the editor code? You can undo this with Ctrl/Cmd+Z.
                                        <Box mt={4}>
                                            <Checkbox isChecked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)}>Don&apos;t show this again</Checkbox>
                                        </Box>
                                    </AlertDialogBody>

                                    <AlertDialogFooter>
                                        <Button ref={cancelRef} onClick={() => setIsClearOpen(false)}>Cancel</Button>
                                        <Button colorScheme="red" onClick={() => {
                                            setCode('');
                                            try { if (typeof window !== 'undefined') window.localStorage.removeItem('lucia_playground_code'); } catch (e) { }
                                            try { if (typeof window !== 'undefined') window.localStorage.setItem('lucia_skip_clear_confirm', dontShowAgain ? 'true' : 'false'); } catch (e) { }
                                            setIsClearOpen(false);
                                        }} ml={3}>Clear</Button>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialogOverlay>
                        </AlertDialog>
                    </Box>

                    <Box>
                        <Text mb={2}>Output</Text>
                        <Box p={2} bg={bgOutput} color={textColor} borderRadius="md" minH="150px">
                            {versionMsg ? (
                                <div style={{ color: accentLight, fontWeight: 700, marginBottom: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', fontSize: Math.round(12 * fontScale) }}>{versionMsg}</div>
                            ) : (
                                <div style={{ color: accentLight, fontWeight: 700, marginBottom: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', fontSize: Math.round(12 * fontScale) }}>Running Lucia</div>
                            )}
                            <pre style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', fontSize: Math.round(12 * fontScale), whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.1 }} dangerouslySetInnerHTML={{ __html: outputHtml }} />
                        </Box>
                    </Box>
                </VStack>

                <Box as="footer" mt={8} py={4} borderTopWidth={1} borderColor={useColorModeValue('gray.200', 'gray.700')}>
                    <HStack maxW="container.lg" mx="auto" justify="space-between" spacing={4} align="center">
                        <HStack spacing={4} align="center">
                            <Link href="https://github.com/SirPigari/lucia-rust" isExternal _hover={{ textDecoration: 'none' }} color={accentLight}>
                                <HStack>
                                    <PackageIcon color={accentLight} size={16} />
                                    <Text fontSize="sm">Lucia (repo)</Text>
                                </HStack>
                            </Link>

                            <Link href="https://github.com/SirPigari/lucia-rust#readme" isExternal _hover={{ textDecoration: 'none' }} color={accentLight}>
                                <HStack>
                                    <FileTextIcon color={accentLight} size={16} />
                                    <Text fontSize="sm">Docs</Text>
                                </HStack>
                            </Link>

                            <Link href="https://github.com/SirPigari/lym" isExternal _hover={{ textDecoration: 'none' }} color={accentLight}>
                                <HStack>
                                    <BoxIcon color={accentLight} size={16} />
                                    <Text fontSize="sm">Lym</Text>
                                </HStack>
                            </Link>
                        </HStack>

                        <HStack spacing={3}>
                            <Link href="https://webassembly.org/" isExternal color={accentLight} aria-label="WebAssembly">
                                <BoxIcon size={16} color={accentLight} />
                            </Link>
                            <Link href="https://www.rust-lang.org/" isExternal color={accentLight} aria-label="Rust">
                                <CpuIcon size={16} color={accentLight} />
                            </Link>
                            <Link href="https://opensource.org/licenses/GPL-3.0" isExternal color={accentLight} aria-label="GPLv3">
                                <FileTextIcon size={16} color={accentLight} />
                            </Link>
                        </HStack>
                    </HStack>
                </Box>

            </Container>
        </Flex>
    );
}

function renderAnsi(input: string) {
    try {
        const au = new AnsiUp();
        au.use_classes = false;
        const html = au.ansi_to_html(input);
        return html;
    } catch (e) {
        return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
