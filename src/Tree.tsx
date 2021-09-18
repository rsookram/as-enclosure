import React, { useMemo, useRef } from "react";
import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  hierarchy,
  pack,
  scaleLinear,
} from "d3";
import { FileType } from "./types";
import countBy from "lodash/countBy";
import maxBy from "lodash/maxBy";
import entries from "lodash/entries";
import uniqBy from "lodash/uniqBy";
// file colors are from the github/linguist repo
import fileColors from "./language-colors.json";
import { CircleText } from "./CircleText";
import {
  keepBetween,
  keepCircleInsideCircle,
  truncateString,
} from "./utils";

type Props = {
  data: FileType;
};

type ExtendedFileType = {
  extension?: string;
  pathWithoutExtension?: string;
  label?: string;
  color?: string;
  value?: number;
  sortOrder?: number;
} & FileType;

type ProcessedDataItem = {
  data: ExtendedFileType;
  depth: number;
  height: number;
  r: number;
  x: number;
  y: number;
  parent: ProcessedDataItem | null;
  children: Array<ProcessedDataItem>;
};

const looseFilesId = "__structure_loose_file__";
const width = 1000;
const height = 1000;
const maxDepth = 9;

export const Tree = ({ data }: Props) => {
  const cachedPositions = useRef<{ [key: string]: [number, number] }>({});
  const cachedOrders = useRef<{ [key: string]: string[] }>({});

  const getColor = (d) => {
    const isParent = d.children;
    if (isParent) {
      const extensions = countBy(d.children, (c) => c.extension);
      const mainExtension = maxBy(entries(extensions), ([k, v]) => v)?.[0];
      return fileColors[mainExtension] ?? "#CED6E0";
    }
    return fileColors[d.extension] ?? "#CED6E0";
  };

  const packedData = useMemo(() => {
    const hierarchicalData = hierarchy(
      processChild(data, getColor, cachedOrders.current),
    ).sum((d) => d.value)
      .sort((a, b) => {
        return (b.data.sortOrder - a.data.sortOrder) ||
          (b.data.name > a.data.name ? 1 : -1);
      });

    let packedTree = pack()
      .size([width, height * 1.3]) // we'll reflow the tree to be more horizontal, but we want larger bubbles (.pack() sizes the bubbles to fit the space)
      .padding((d) => {
        if (d.depth <= 0) return 0;
        const hasChildWithNoChildren = d.children.filter((d) =>
          !d.children?.length
        ).length > 1;
        if (hasChildWithNoChildren) return 5;
        return 11;
      })(hierarchicalData);
    packedTree.children = reflowSiblings(
      packedTree.children,
      cachedPositions.current,
    );
    const children = packedTree.descendants() as ProcessedDataItem[];

    cachedOrders.current = {};
    cachedPositions.current = {};
    const saveCachedPositionForItem = (item) => {
      cachedOrders.current[item.data.path] = item.data.sortOrder;
      if (item.children) {
        item.children.forEach(saveCachedPositionForItem);
      }
    };
    saveCachedPositionForItem(packedTree);
    children.forEach((d) => {
      cachedPositions.current[d.data.path] = [d.x, d.y];
    });

    return children;
  }, [data]);

  const fileTypes = uniqBy(
    packedData.map((d) => fileColors[d.data.extension] && d.data.extension),
  ).sort().filter(Boolean);

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: "white",
        fontFamily: "sans-serif",
        overflow: "visible",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        let runningR = r;
        if (data.path === looseFilesId) return null;

        return (
          <g
            key={data.path}
            style={{
              fill: data.color,
              transition: `transform 0s ease-out, fill 0.1s ease-out`,
            }}
            transform={`translate(${x}, ${y})`}
          >
            {isParent
              ? (
                <circle
                  r={r}
                  style={{ transition: "all 0.5s ease-out" }}
                  stroke="#290819"
                  opacity="0.2"
                  strokeWidth="1"
                  fill="none"
                />
              )
              : (
                <circle
                  style={{
                    transition: "all 0.5s ease-out",
                  }}
                  r={runningR}
                  strokeWidth={0}
                  stroke="#374151"
                />
              )}
          </g>
        );
      })}

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        if (data.path === looseFilesId) return null;
        if (isParent) return null
        if (r <= 30) return null

        return (
          <g
            key={data.path}
            style={{
              fill: data.color,
              transition: `transform 0s ease-out, fill 0.1s ease-out`,
            }}
            transform={`translate(${x}, ${y})`}
          >

            <text
              style={{
                pointerEvents: "none",
                opacity: 0.9,
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.5s ease-out",
              }}
              fill="#4B5563"
              textAnchor="middle"
              dominantBaseline="middle"
              stroke="white"
              strokeWidth="3"
              strokeLinejoin="round"
            >
              {data.label}
            </text>
            <text
              style={{
                pointerEvents: "none",
                opacity: 1,
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.5s ease-out",
              }}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {data.label}
            </text>
            <text
              style={{
                pointerEvents: "none",
                opacity: 0.9,
                fontSize: "14px",
                fontWeight: 500,
                mixBlendMode: "color-burn",
                transition: "all 0.5s ease-out",
              }}
              fill="#110101"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {data.label}
            </text>
          </g>
        );
      })}

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        if (!isParent) return null;
        if (data.path === looseFilesId) return null;
        if (r < 10) return null;
        return (
          <g
            key={data.path}
            style={{ pointerEvents: "none", transition: "all 0.5s ease-out" }}
            transform={`translate(${x}, ${y})`}
          >
            <CircleText
              style={{ fontSize: "14px", transition: "all 0.5s ease-out" }}
              r={Math.max(20, r - 3)}
              fill="#374151"
              stroke="white"
              strokeWidth="6"
              text={data.label}
            />
            <CircleText
              style={{ fontSize: "14px", transition: "all 0.5s ease-out" }}
              fill="#374151"
              r={Math.max(20, r - 3)}
              text={data.label}
            />
          </g>
        );
      })}

      {<Legend fileTypes={fileTypes} />}
    </svg>
  );
};

const Legend = ({ fileTypes = [] }) => {
  return (
    <g
      transform={`translate(${width - 80}, ${height - fileTypes.length * 15 -
        20})`}
    >
      {fileTypes.map((extension, i) => (
        <g key={i} transform={`translate(0, ${i * 15})`}>
          <circle
            r="5"
            fill={fileColors[extension]}
          />
          <text
            x="10"
            style={{ fontSize: "14px", fontWeight: 300 }}
            dominantBaseline="middle"
          >
            .{extension}
          </text>
        </g>
      ))}
      <div
        className="w-20 whitespace-nowrap text-sm text-gray-500 font-light italic"
      >
        each dot sized by file size
      </div>
    </g>
  );
};

const processChild = (
  child: FileType,
  getColor,
  cachedOrders,
  i = 0,
): ExtendedFileType => {
  if (!child) return;
  const isRoot = !child.path;
  let name = child.name;
  let path = child.path;
  let children = child?.children?.map((c, i) =>
    processChild(c, getColor, cachedOrders, i)
  );
  if (children?.length === 1) {
    name = `${name}/${children[0].name}`;
    path = children[0].path;
    children = children[0].children;
  }
  const pathWithoutExtension = path?.split(".").slice(0, -1).join(".");
  const extension = name?.split(".").slice(-1)[0];
  const hasExtension = !!fileColors[extension];

  if (isRoot && children) {
    const looseChildren = children?.filter((d) => !d.children?.length);
    children = [
      ...children?.filter((d) => d.children?.length),
      {
        name: looseFilesId,
        path: looseFilesId,
        size: 0,
        children: looseChildren,
      },
    ];
  }

  let extendedChild = {
    ...child,
    name,
    path,
    label: truncateString(name, 13),
    extension,
    pathWithoutExtension,

    value:
      (["woff", "woff2", "ttf", "png", "jpg", "svg"].includes(extension)
        ? 100
        : // I'm sick of these fonts
        Math.min(
          15000,
          hasExtension ? child.size : Math.min(child.size, 9000),
        )) + i, // stupid hack to stabilize circle order/position
    color: "#fff",
    children,
  };
  extendedChild.color = getColor(extendedChild);
  extendedChild.sortOrder = getSortOrder(extendedChild, cachedOrders, i);

  return extendedChild;
};

const reflowSiblings = (
  siblings: ProcessedDataItem[],
  cachedPositions: Record<string, [number, number]> = {},
  parentRadius?: number,
  parentPosition?: [number, number],
) => {
  if (!siblings) return;
  let items = [...siblings.map((d) => {
    return {
      ...d,
      x: cachedPositions[d.data.path]?.[0] || d.x,
      y: cachedPositions[d.data.path]?.[1] || d.y,
      originalX: d.x,
      originalY: d.y,
    };
  })];
  const paddingScale = scaleLinear().domain([4, 1]).range([2, 10]).clamp(true);
  let simulation = forceSimulation(items)
    .force(
      "centerX",
      forceX(width / 2).strength(items[0].depth <= 2 ? 0.01 : 0),
    )
    .force(
      "centerY",
      forceY(height / 2).strength(items[0].depth <= 2 ? 0.05 : 0),
    )
    .force(
      "centerX2",
      forceX(parentPosition?.[0]).strength(parentPosition ? 0.5 : 0),
    )
    .force(
      "centerY2",
      forceY(parentPosition?.[1]).strength(parentPosition ? 0.5 : 0),
    )
    .force(
      "x",
      forceX((d) => cachedPositions[d.data.path]?.[0] || width / 2).strength(
        (d) => cachedPositions[d.data.path]?.[1] ? 0.5 : 0.2,
      ),
    )
    .force(
      "y",
      forceY((d) => cachedPositions[d.data.path]?.[1] || height / 2).strength(
        (d) => cachedPositions[d.data.path]?.[0] ? 0.5 : 0.1,
      ),
    )
    .force(
      "collide",
      forceCollide((d) => d.children ? d.r + paddingScale(d.depth) : d.r + 2)
        .iterations(9).strength(1),
    )
    .stop();

  for (let i = 0; i < 290; i++) {
    simulation.tick();
    items.forEach((d) => {
      d.x = keepBetween(d.r, d.x, width - d.r);
      d.y = keepBetween(d.r + 30, d.y, height - d.r);

      if (parentPosition && parentRadius) {
        // keep within radius
        const containedPosition = keepCircleInsideCircle(
          parentRadius,
          parentPosition,
          d.r,
          [d.x, d.y],
        );
        d.x = containedPosition[0];
        d.y = containedPosition[1];
      }
    });
  }
  const repositionChildren = (d, xDiff, yDiff) => {
    let newD = { ...d };
    newD.x += xDiff;
    newD.y += yDiff;
    if (newD.children) {
      newD.children = newD.children.map((c) =>
        repositionChildren(c, xDiff, yDiff)
      );
    }
    return newD;
  };
  for (const item of items) {
    const itemCachedPosition = cachedPositions[item.data.path] ??
      [item.x, item.y];
    const itemPositionDiffFromCached = [
      item.x - itemCachedPosition[0],
      item.y - itemCachedPosition[1],
    ];

    if (item.children) {
      let repositionedCachedPositions = { ...cachedPositions };
      const itemReflowDiff = [
        item.x - item.originalX,
        item.y - item.originalY,
      ];

      item.children = item.children.map((child) =>
        repositionChildren(
          child,
          itemReflowDiff[0],
          itemReflowDiff[1],
        )
      );
      if (item.children.length > 4) {
        item.children.forEach((child) => {
          // move cached positions with the parent
          const childCachedPosition =
            repositionedCachedPositions[child.data.path];
          if (childCachedPosition) {
            repositionedCachedPositions[child.data.path] = [
              childCachedPosition[0] + itemPositionDiffFromCached[0],
              childCachedPosition[1] + itemPositionDiffFromCached[1],
            ];
          } else {
            repositionedCachedPositions[child.data.path] = [
              child.x,
              child.y,
            ];
          }
        });
        item.children = reflowSiblings(
          item.children,
          repositionedCachedPositions,
          item.r,
          [item.x, item.y],
        );
      }
    }
  }
  return items;
};

const getSortOrder = (item: ExtendedFileType, cachedOrders, i = 0) => {
  if (cachedOrders[item.path]) return cachedOrders[item.path];
  if (cachedOrders[item.path?.split("/")?.slice(0, -1)?.join("/")]) {
    return -100000000;
  }
  if (item.name === "public") return -1000000;
  return item.value + -i;
};
