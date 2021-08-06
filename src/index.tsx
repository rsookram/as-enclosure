import readline from "readline";

import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { Tree } from "./Tree.tsx"

const fromStdin = async () => {
  const rl = readline.createInterface(process.stdin)

  const tree = {
    name: '.',
    path: '',
    size: 4096
  }

  for await (const line of rl) {
    const [path, count] = line.split(':')
    const segments = path.split('/')

    let node = tree

    let currentPath = ''

    for (segment of segments.slice(0, segments.length - 1)) {
      if (currentPath) {
        currentPath += '/' + segment
      } else {
        currentPath += segment
      }

      node.children = node.children || []
      const children = node.children

      let foundNode = children.find(n => n.name === segment)
      if (foundNode) {
        node = foundNode
      } else {
        const newNode = {
          name: segment,
          path: currentPath,
          size: 4096,
        }
        children.push(newNode)
        node = newNode
      }
    }

    const children = node.children || []
    node.children = children

    const name = segments[segments.length - 1]
    children.push({
      name,
      path: currentPath + '/' + name,
      size: parseInt(count, 10)
    })
  }

  return tree
}

const main = async () => {
  const data = await fromStdin();

  const componentCodeString = ReactDOMServer.renderToStaticMarkup(
    <Tree data={data} />
  );

  console.log(componentCodeString)
}

main()
