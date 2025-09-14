

import React from 'react';
import Head from 'next/head';

export default function OldHome() {
  const html = `<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Lucia WASM</title>
    <style>
      /* Local styles so the archived page looks identical and doesn't pick up browser defaults */
      html,body{margin:0;padding:16px;color:#111;background:#fff;font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial}
      a{color:inherit;text-decoration:none}
      svg, img{color:inherit;fill:currentColor}
      textarea{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace}
    </style>
</head>

<body>
    <h1>Lucia WASM playground</h1>

    <textarea id="code" rows="10" cols="80">// write some lucia code here
name := "Lucia"
print(f"hello from {name}")
    </textarea>
    <br>
    <button id="runBtn">Run</button>

    <pre id="output"></pre>

    <script>
      (async function(){
        try {
          // runtime import from the API route; webpack should ignore this
          const mod = await import(/* webpackIgnore: true */ '/api/pkg/web/pkg/lucia_wasm.js');

          function appendOutput(text){
            const outputElem = document.getElementById('output');
            if(outputElem) outputElem.textContent += text + '\n';
          }

          if(mod.set_print_callback) mod.set_print_callback((msg)=> appendOutput(String(msg)));
          if(mod.set_clear_callback) mod.set_clear_callback(()=> { const e = document.getElementById('output'); if(e) e.textContent = ''; });

          document.getElementById('runBtn').addEventListener('click', async ()=>{
            const code = (document.getElementById('code')||{}).value || '';
            try {
              if(mod.run_code_wasm_no_config) await mod.run_code_wasm_no_config(code);
              else if(mod.run_code) await mod.run_code(code);
              else appendOutput('Run function not found');
            } catch(e){ appendOutput('Error: '+e); }
          });
        } catch(e){
          console.error('wasm import failed', e);
          const out = document.getElementById('output'); if(out) out.textContent += 'Failed to load wasm: '+e+'\n';
        }
      })();
    </script>

</body>

</html>`;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Head>
        <title>Lucia WASM (archived)</title>
      </Head>
      <iframe
        title="Archived Lucia WASM"
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: '100%', height: '80vh', border: 'none' }}
      />
    </div>
  );
}
