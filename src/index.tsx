import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from "fs"

import { processDir } from "./process-dir.js"
import { Tree } from "./Tree.tsx"

const main = async () => {
  const data = await processDir(`./`);

  const componentCodeString = ReactDOMServer.renderToStaticMarkup(
    <Tree data={data} />
  );

  const outputFile = "./diagram.svg"

  await fs.writeFileSync(outputFile, componentCodeString)

  console.log("All set!")
}

main()
