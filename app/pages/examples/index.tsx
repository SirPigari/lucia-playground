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
import { Sun, Moon, Github, Package as PackageIcon, Box as BoxIcon, Cpu as CpuIcon, Code, FileText as FileTextIcon, Play, Trash2, Link as LucideLink } from 'lucide-react';
import AnsiUp from 'ansi_up';
import dynamic from 'next/dynamic';
import NextImage from 'next/image';

declare global {
    interface Window {
        __lucia_wasm_inited?: boolean;
    }
}

const CodeEditor = dynamic(() => import('../../components/CodeEditor'), { ssr: false });

type Example = {
    id: string;
    desc: string;
    code: string;
    link?: [string, string];
};

const EXAMPLES: Example[] = [
    { id: 'for-loop', desc: 'For loops are declared with the "for" keyword. Each block in lucia ends with the "end" keyword.\nThe "[x..y]" syntax is used to create a range of values. It returns a generator. The range is always inclusive, and you can specify the next value using "[y, next..x]". The step is implicitly calculated as "| next - y |".\n\nTry changing the code a bit to see how it behaves.', code: 'for i in [1..5]:\n    print(i)\nend' },
    { id: 'variable-decl', desc: 'You can declare variables two different ways. One way, the most often used, is with the ":=" syntax. This is used for auto type inference. The other way is with the "x: T" syntax. This is used for explicit variable types.\n\nSome of the types are: int, str, float, bool, void, any...\n\nWhen the value is missing (so no "=") it assign to the default value of the type or null if no default was found.', code: 'x := 10\nname: str = "Lucia"\nempty: void  // null\n\n// print em all\nprint(x, name, empty, sep=", ")' },
    { id: 'variable-assign', desc: 'You can assign values to variables like in any other language. Just use the "=".\n\nTry  commenting out the first line to see what happens.', code: 'state := "running"\nprint(state)\nstate = "paused"\nprint(state)\n' },
    { id: 'function-decl', desc: 'Functions are declared with the "fun" keyword. Each function has a name, a list of parameters, return type, and a body.\n\nReturn type can be omitted, in which case it defaults to "any".', code: 'fun greet(name: str):\n    print(f"Hello, {name}!")\nend\n\ngreet("Lucia")\n\nfun add(a: int, b: int) -> int:\n    return a + b\nend\n\nprint(add(6, 7))' },
    { id: 'if-else', desc: 'Conditional statements are declared with the "if" keyword. \n\nYou can have multiple "else if" branches and an optional "else" branch.', code: 'age := 20\nif age < 13:\n    print("You are a child.")\nelse if age < 20:\n    print("You are a teenager.")\nelse:\n    print("You are an adult.")\nend' },
    { id: 'while-loop', desc: 'While loops are declared with the "while" keyword. ', code: 'count := 0\n\nwhile count < 5:\n    print(f"Count is {count}")\n    count += 1\nend' },
    { id: 'list', desc: 'Lists are ordered collections of values. They can contain values of different types. Lists are mutable, but append/extend return new list instead of mutating (bug).', code: 'fruits := ["apple", "banana", "cherry"]\nprint(fruits)\n\nfruits = fruits.append("date")\nprint(fruits)\n\nfor (fruit in fruits):\n    print(fruit)\nend' },
    { id: 'map', desc: 'Maps are collections of key-value pairs. Keys are unique and can be of any type. Values can be of any type as well.', code: 'person := {"name": "Alice", "age": 30, "city": "New York"}\nprint(person)\n\n// Accessing values\nprint(person["name"])\n\n// Adding a new key-value pair\nperson["job"] = "Engineer"\nprint(person)\n\n// Iterating over keys and values\nfor (key in person.keys()):\n    print(f"{key}: {person[key]}")\nend' },
    { id: 'error-handling', desc: 'Errors can be handled with the "try" keyword. The code inside the "try" block is executed, and if an error occurs, the code inside the "catch" block is executed.\n\nThe error tuple is available as "e" inside the catch block.', code: 'fun divide(a: int, b: int) -> float:\n    return (a / b) as float\nend\n\ntry:\n    result := divide(10, 0)\n    print(f"Result: {result}")\ncatch (e):\n    print(f"Error occurred: {e}")\nend\n\ntry:\n    result := divide(10, 5)\n    print(f"Result: {result}")\ncatch (err_type, err_msg):\n    print(f"Error occurred: {err_type}: {err_msg}")\nend' },
    { id: 'import', desc: 'You can import standard library modules with the "import" keyword. \n\nSome of the available modules are: random, math, time, os, regex, json...\n\nYou can also import specific functions or variables from a module with the "from" keyword.\n\nSleeping is simulated in WASM because js is single threaded.', code: 'import random\nimport math\nimport (sleep) from time\n\n// Random integer between 1 and 100\nlucky_number := random.randint(1, 100)\nprint(f"Your lucky number is: {lucky_number}")\n\n// Square root of 16\nprint(f"Square root of 16 is: {math.sqrt(16)}")\n\nfor i in [1..5]:\n    sleep(500) // in milliseconds\n    print(i)\nend' },
    { id: 'macro', desc: 'Macros are a way to define reusable code snippets. They are declared with the "#macro" directive. Macros can take parameters and can be called like functions, but they are expanded at preprocessor time.\n\nThis example defines a simple logging macro that prints a message with a timestamp.', code: 'import time\n\n#macro log($message):\n    print(f"[{time.format(\'%Y-%m-%d %H:%M:%S\')}] $message$")\n#endmacro\n\nlog!("This is a log message.")\nlog!("Another log entry.")\n', link: ['https://github.com/SirPigari/lucia-rust/blob/main/tests/15_macros.lc', 'Macro examples'] },
];

export default function ExamplesPage() {
    const [examples, setExamples] = useState(EXAMPLES);
    const [outputs, setOutputs] = useState<Record<string, string>>({});
    const [outputHtmlMap, setOutputHtmlMap] = useState<Record<string, string>>({});
    const [codes, setCodes] = useState<Record<string, string>>(() => {
        const m: Record<string, string> = {};
        for (const ex of EXAMPLES) m[ex.id] = ex.code;
        return m;
    });
    const wasmRef = useRef<any>(null);
    const outputRef = useRef<Record<string, string>>({});
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

    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            const storageKey = 'chakra-ui-color-mode';
            const stored = window.localStorage.getItem(storageKey);
            if (stored === null) {
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if ((prefersDark && colorMode !== 'dark') || (!prefersDark && colorMode !== 'light')) {
                    toggleColorMode();
                }
            }
        } catch (e) { }
    }, [toast, colorMode, toggleColorMode]);
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
            const candidates = ['/lucia-playground/pkg/lucia_wasm.js', '/pkg/lucia_wasm.js'];
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
                        } else if (wasmModule.get_lucia_version_async) {
                            const ver = await wasmModule.get_lucia_version_async();
                        }
                        const htmlMap: Record<string, string> = {};
                        for (const k of Object.keys(outputRef.current || {})) htmlMap[k] = renderAnsi(outputRef.current[k] || '');
                        setOutputHtmlMap(htmlMap);
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
                        });
                    }
                    if (typeof wasmModule.set_clear_callback === 'function') {
                        wasmModule.set_clear_callback(() => { });
                    }

                    setIsReady(true);
                    setLoadingMsg('WASM ready');
                    return;
                } catch (err) {
                    lastErr = err;
                }
            }
            setOutputHtmlMap((prev) => ({ ...prev, __global: (prev.__global || '') + 'WASM load/init error: ' + String(lastErr) + '\n' }));
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

    async function runExample(id: string, codeToRun: string) {
        outputRef.current[id] = '';
        setOutputs({ ...outputRef.current });
        setOutputHtmlMap((m) => ({ ...m, [id]: renderAnsi('') }));
        if (!wasmRef.current) {
            outputRef.current[id] += 'WASM not loaded';
            setOutputs({ ...outputRef.current });
            setOutputHtmlMap((m) => ({ ...m, [id]: renderAnsi(outputRef.current[id]) }));
            return;
        }
        try {
            if (typeof wasmRef.current.set_print_callback === 'function') {
                wasmRef.current.set_print_callback((msg: string) => {
                    outputRef.current[id] = (outputRef.current[id] || '') + msg;
                    setOutputs({ ...outputRef.current });
                    setOutputHtmlMap((m) => ({ ...m, [id]: renderAnsi(outputRef.current[id] || '') }));
                });
            }

            const cfg = wasmRef.current.get_default_config();
            cfg.supports_color = true;
            cfg.type_checker = cfg.type_checker || {};
            cfg.type_checker.enabled = true;
            await wasmRef.current.run_code_wasm(codeToRun.replace(/\r\n/g, '\n'), cfg);
        } catch (e) {
            outputRef.current[id] = (outputRef.current[id] || '') + '\nError: ' + String(e) + '\n';
            setOutputs({ ...outputRef.current });
            setOutputHtmlMap((m) => ({ ...m, [id]: renderAnsi(outputRef.current[id]) }));
        }
    }

    function clearOutputFor(id: string) {
        outputRef.current[id] = '';
        setOutputs({ ...outputRef.current });
        setOutputHtmlMap((m) => ({ ...m, [id]: '' }));
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
                const first = examples[0];
                if (first) runExample(first.id, codes[first.id]);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [examples, codes, isReady]);

    return (
        <Flex>
            <Head>
                <title>Lucia Playground</title>
            </Head>
            <Box display={{ base: 'none', md: 'block' }} w="260px" p={6} minH="100vh" bgGradient={useColorModeValue('linear(to-b, pink.50, white)', 'linear(to-b, gray.900, #0b0226)')} color={textColor} borderRightWidth={useColorModeValue('1px', '0')}>
                <VStack align="start" spacing={6}>
                    <HStack spacing={3} align="center">
                        <Box p={0} borderRadius="md" overflow="hidden" boxSize="40px">
                            <NextImage src="/lucia-playground/icon.svg" alt="Lucia" width={40} height={40} />
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
                                <NextImage src="/lucia-playground/icon.svg" alt="Lucia" width={32} height={32} />
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

                    <VStack spacing={6} align="stretch">
                        {examples.map((ex) => (
                            <Box key={ex.id} borderWidth={1} borderRadius="md" p={4} bg={bgOutput}>
                                <HStack justify="space-between" align="start">
                                    <Text fontWeight={700}>{ex.desc}</Text>

                                    <VStack spacing={1} align="end">
                                        <HStack spacing={2}>
                                            <Button
                                                size="sm"
                                                leftIcon={<Play />}
                                                colorScheme="blue"
                                                onClick={() => runExample(ex.id, codes[ex.id])}
                                                isDisabled={!isReady}
                                            >
                                                Run
                                            </Button>
                                            <IconButton
                                                aria-label={`Clear output ${ex.id}`}
                                                size="sm"
                                                icon={<Trash2 />}
                                                onClick={() => clearOutputFor(ex.id)}
                                            />
                                        </HStack>

                                        {ex.link && (
                                            <Link
                                                href={ex.link[0]}
                                                isExternal
                                                display="inline-flex"
                                                alignItems="center"
                                                color="blue.500"
                                                mt={1}
                                                whiteSpace="nowrap"
                                                overflow="hidden"
                                                textOverflow="ellipsis"
                                            >
                                                <LucideLink size={16} style={{ marginRight: 4 }} />
                                                {ex.link[1]}
                                            </Link>
                                        )}
                                    </VStack>
                                </HStack>

                                <Box mt={3}>
                                    <CodeEditor
                                        value={codes[ex.id] ?? ''}
                                        fontSize={Math.round(13 * fontScale)}
                                        onChange={(v) => setCodes((s) => ({ ...s, [ex.id]: v }))}
                                    />
                                </Box>

                                <Box mt={3}>
                                    <Text mb={2}>Output</Text>
                                    <Box p={2} bg={bgOutput} color={textColor} borderRadius="md" minH="80px">
                                        <pre style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', fontSize: Math.round(12 * fontScale), whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.1 }} dangerouslySetInnerHTML={{ __html: outputHtmlMap[ex.id] ?? '' }} />
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </VStack>
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

                            <Link href="/lucia-playground/" _hover={{ textDecoration: 'none' }} color={accentLight}>
                                <HStack>
                                    <Code color={accentLight} size={16} />
                                    <Text fontSize="sm">Lucia Playground</Text>
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