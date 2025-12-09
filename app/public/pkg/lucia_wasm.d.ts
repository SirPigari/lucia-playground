/* tslint:disable */
/* eslint-disable */

export function get_default_config(): any;

export function get_lucia_version(): string;

export function run_code_wasm(code: string, config_js: any): void;

export function run_code_wasm_no_config(code: string): void;

export function set_clear_callback(cb: Function): void;

export function set_input_callback(cb: Function): void;

export function set_panic_hook(): void;

export function set_print_callback(cb: Function): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly set_print_callback: (a: any) => void;
  readonly set_input_callback: (a: any) => void;
  readonly set_clear_callback: (a: any) => void;
  readonly set_panic_hook: () => void;
  readonly get_default_config: () => any;
  readonly run_code_wasm: (a: number, b: number, c: any) => void;
  readonly get_lucia_version: () => [number, number];
  readonly run_code_wasm_no_config: (a: number, b: number) => void;
  readonly main: (a: number, b: number) => number;
  readonly wasm_bindgen__convert__closures_____invoke__h0b501f804cff8413: (a: number, b: number) => void;
  readonly wasm_bindgen__closure__destroy__h42d87810ddde15dd: (a: number, b: number) => void;
  readonly wasm_bindgen__convert__closures_____invoke__hd3752743bc2ae611: (a: number, b: number, c: any) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
