import readline from "readline"

export const readFromStdin = async () => {
  const rl = readline.createInterface(process.stdin)

  const tree = {
    name: '.',
    path: '',
    size: 4096
  }

  for await (const line of rl) {
    updateTree(tree, parseLine(line))
  }

  return tree
}

const updateTree = (node, { dirs, name, count }) => {
  let currentPath = ''

  for (dir of dirs) {
    if (currentPath) {
      currentPath += '/' + dir
    } else {
      currentPath += dir
    }

    node.children = node.children || []
    const children = node.children

    let foundNode = children.find(n => n.name === dir)
    if (foundNode) {
      node = foundNode
    } else {
      const newNode = {
        name: dir,
        path: currentPath,
        size: 4096,
        children: []
      }
      children.push(newNode)
      node = newNode
    }
  }

  if (!node.children) {
    // This happens when the first file is an immediate child of the root of
    // the hierarchy (dirs is empty)
    node.children = []
  }

  node.children.push({
    name,
    path: currentPath + '/' + name,
    size: count
  })
}

// Expected format for line: "src/index.tsx:4"
const parseLine = (line) => {
  const [path, count] = line.split(':')
  const segments = path.split('/')

  return {
    dirs: segments.slice(0, segments.length - 1),
    name: segments[segments.length - 1],
    count: parseInt(count, 10)
  }
}
