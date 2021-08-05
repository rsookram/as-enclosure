import fs from "fs";

export const processDir = async (rootPath, excludedPaths = []) => {
  if (!rootPath) {
    return;
  }

  const getFileStats = async (path = "") => {
    const stats = await fs.statSync(path);
    const name = path.split("/").filter(Boolean).slice(-1)[0];
    const size = stats.size;
    const relativePath = path.slice(rootPath.length + 1);
    return {
      name,
      path: relativePath,
      size,
    };
  };
  const addItemToTree = async (
    path = "",
    isFolder = true,
  ) => {
    try {
      if (isFolder) {
        const files = await fs.readdirSync(path);
        const children = []
        for (const file of files) {
          const info = fs.statSync(path + "/" + file);

          const stats = await addItemToTree(
            path + "/" + file,
            info.isDirectory(),
          );
          if (stats) children.push(stats);
        }
        const stats = await getFileStats(path);
        return { ...stats, children };
      } else {
        const stats = getFileStats(path);
        return stats;
      }
    } catch (e) {
      return null;
    }
  };

  const tree = await addItemToTree(rootPath);

  return tree;
};
