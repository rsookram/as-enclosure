import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { readFromStdin } from "./read-from-stdin.ts"
import { Tree } from "./Tree.tsx"

const main = async () => {
  const data = await readFromStdin();

  const componentCodeString = ReactDOMServer.renderToStaticMarkup(
    <Tree data={data} />
  );

  console.log(componentCodeString)
}

main()
