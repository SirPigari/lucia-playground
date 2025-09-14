import React, { useMemo } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import syntax from '../src/syntax.json';
import { Box } from '@chakra-ui/react';

// Extract simple lists from the TextMate grammar to build regexes
function extractWordsByRepoKey(key: string) {
    try {
        const repo: any = (syntax as any).repository || {};
        if (!repo[key]) return [];
        const patterns = repo[key].patterns || [];
        const words: string[] = [];
        for (const p of patterns) {
            if (p.match) {
                // try to extract the alternation group inside parentheses: (a|b|c)
                const m = p.match.match(/\(([^)]+)\)/);
                if (m) {
                    const parts = m[1].split('|').map((s: string) => s.replace(/\\b/g, '').trim()).filter(Boolean);
                    words.push(...parts);
                }
            }
        }
        return words;
    } catch (e) {
        return [];
    }
}

const keywords = extractWordsByRepoKey('keywords');
const types = extractWordsByRepoKey('types');

// Register a small lucia language with Prism using extracted keywords/types
function registerLuciaLanguage() {
    if ((Prism.languages as any).lucia) return;
    (Prism.languages as any).lucia = {
        comment: /\/\/.*|<#[\s\S]*?#>|\/\*[\s\S]*?\*\//,
        // preprocessor token: find '#' anywhere followed by a single identifier (letters and hyphen)
        preprocessor: {
            pattern: /#[ \t]*[A-Za-z-]+/,
            inside: {
                hash: /#/, // the # character
                ident: /[A-Za-z-]+/ // the identifier to highlight
            }
        },
        // macros: name! ( ... ) or name![ ... ] or name!< ... >
        macro: {
            pattern: /\b[A-Za-z_][A-Za-z0-9_-]*!\s*(?:\([^\)]*\)|\[[^\]]*\]|<[^>]*>)/,
            inside: {
                name: /^[A-Za-z_][A-Za-z0-9_-]*(?=!)/,
                bang: /!/,
                args: /(?:\([^\)]*\)|\[[^\]]*\]|<[^>]*>)/
            }
        },
        string: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')/,
        number: /\b-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\b/,
        keyword: new RegExp('\\b(' + keywords.map(escapeRegExp).join('|') + ')\\b'),
        type: new RegExp('\\b(' + types.map(escapeRegExp).join('|') + ')\\b'),
        // function names: identifier followed by an opening parenthesis (lookahead)
        'function': /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/,
        operator: /->|>=|<=|==|!=|\+=|-=|\*=|\/=|=|<<|>>|\+\+|--|\+|-|\^|\*|\/|>|<|!|%|\|\||&&|\||#|~|\$|\?|&|\^=|%=|\.\.\.|\.\.|[(){}\[\];:.,\?]/,
    } as any;
}

function highlight(code: string) {
    registerLuciaLanguage();
    const html = Prism.highlight(code, (Prism.languages as any).lucia, 'lucia');
    // Prism emits token classes (token keyword, token string, etc.). Map some classes to inline styles
    return html
        .replace(/class=\"token keyword\"/g, 'style=\"color:#7c4dff;font-weight:600\"')
        .replace(/class=\"token string\"/g, 'style=\"color:#9ccc65\"')
        .replace(/class=\"token comment\"/g, 'style=\"color:#9e9e9e;font-style:italic\"')
        .replace(/class=\"token number\"/g, 'style=\"color:#ffb86c\"')
        .replace(/class=\"token type\"/g, 'style=\"color:#00c2a8\"')
        .replace(/class=\"token function\"/g, 'style=\"color:#ff66b3;font-weight:700\"')
        // highlight the '#' and the identifier in blue
        .replace(/class=\"token hash\"/g, 'style=\"color:#3b82f6;font-weight:700\"')
        .replace(/class=\"token ident\"/g, 'style=\"color:#3b82f6;font-weight:700\"')
        // macro parts
        .replace(/class=\"token name\"/g, 'style=\"color:#ff77d0;font-weight:700\"')
        .replace(/class=\"token bang\"/g, 'style=\"color:#ff77d0;font-weight:700\"')
        .replace(/class=\"token args\"/g, 'style=\"color:#ffb3e6;opacity:0.95\"');

}

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function CodeEditor({ value, onChange, fontSize }: { value: string; onChange: (v: string) => void; fontSize?: number }) {
    const effectiveFontSize = fontSize ?? 13;
    return (
        <Box borderRadius="md" overflow="hidden" borderWidth="1px">
            <Editor
                value={value}
                onValueChange={(v: string) => onChange(v)}
                highlight={(code: string) => highlight(code)}
                padding={10}
                onKeyDown={(e: React.KeyboardEvent<any>) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        const el = e.currentTarget as HTMLTextAreaElement;
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        const newValue = el.value.substring(0, start) + '    ' + el.value.substring(end);
                        onChange(newValue);
                        // move the cursor after the inserted spaces
                        requestAnimationFrame(() => {
                            el.selectionStart = el.selectionEnd = start + 4;
                        });
                    }
                }}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', fontSize: effectiveFontSize, minHeight: 200, background: 'transparent' }}
            />
        </Box>
    );
}
