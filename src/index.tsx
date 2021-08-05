import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { processDir } from "./process-dir.js"
import { Tree } from "./Tree.tsx"

const main = async () => {
  const data = await processDir(`./`);

  const componentCodeString = ReactDOMServer.renderToStaticMarkup(
    <Tree data={data} />
  );

  console.log(componentCodeString)
}

main()
