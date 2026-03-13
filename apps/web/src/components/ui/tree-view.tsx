'use client';

import * as React from 'react';
import { useState, useMemo, useCallback, useRef } from 'react';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

// Generic tree node
export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  data?: T;
  children?: TreeNode<T>[];
}

export interface TreeViewProps<T> {
  nodes: TreeNode<T>[];
  renderNode: (node: TreeNode<T>, level: number, isExpanded: boolean) => React.ReactNode;
  onNodeClick?: (node: TreeNode<T>) => void;
  defaultExpandedIds?: string[];
  expandAll?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  emptyMessage?: string;
}

// Collect all node IDs from a tree (for expandAll)
function collectAllIds<T>(nodes: TreeNode<T>[]): string[] {
  const ids: string[] = [];
  function walk(list: TreeNode<T>[]) {
    for (const node of list) {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return ids;
}

// Recursively filter nodes matching search, returning filtered tree and matching parent IDs
function filterTree<T>(
  nodes: TreeNode<T>[],
  query: string
): { filtered: TreeNode<T>[]; expandedIds: Set<string> } {
  const expandedIds = new Set<string>();
  const lowerQuery = query.toLowerCase();

  function walk(list: TreeNode<T>[]): TreeNode<T>[] {
    const result: TreeNode<T>[] = [];
    for (const node of list) {
      const labelMatches = node.label.toLowerCase().includes(lowerQuery);
      const filteredChildren = node.children ? walk(node.children) : [];
      if (labelMatches || filteredChildren.length > 0) {
        if (filteredChildren.length > 0) {
          expandedIds.add(node.id);
        }
        result.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children && labelMatches ? node.children : undefined,
        });
      }
    }
    return result;
  }

  const filtered = walk(nodes);
  return { filtered, expandedIds };
}

// Flatten visible tree nodes for keyboard navigation
function flattenVisible<T>(nodes: TreeNode<T>[], expanded: Set<string>): TreeNode<T>[] {
  const result: TreeNode<T>[] = [];
  function walk(list: TreeNode<T>[]) {
    for (const node of list) {
      result.push(node);
      if (node.children && node.children.length > 0 && expanded.has(node.id)) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

// Find the parent node of a given node ID
function findParent<T>(nodes: TreeNode<T>[], targetId: string): TreeNode<T> | null {
  function walk(list: TreeNode<T>[], parent: TreeNode<T> | null): TreeNode<T> | null {
    for (const node of list) {
      if (node.id === targetId) return parent;
      if (node.children) {
        const found = walk(node.children, node);
        if (found !== null) return found;
      }
    }
    return null;
  }
  return walk(nodes, null);
}

// Get the depth level of a node
function getNodeLevel<T>(nodes: TreeNode<T>[], targetId: string): number {
  function walk(list: TreeNode<T>[], level: number): number {
    for (const node of list) {
      if (node.id === targetId) return level;
      if (node.children) {
        const found = walk(node.children, level + 1);
        if (found >= 0) return found;
      }
    }
    return -1;
  }
  return walk(nodes, 0);
}

interface TreeNodeRowProps<T> {
  node: TreeNode<T>;
  level: number;
  expanded: Set<string>;
  focusedId: string | null;
  onToggle: (id: string) => void;
  onNodeClick?: (node: TreeNode<T>) => void;
  onFocus: (id: string) => void;
  renderNode: (node: TreeNode<T>, level: number, isExpanded: boolean) => React.ReactNode;
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

function TreeNodeRow<T>({
  node,
  level,
  expanded,
  focusedId,
  onToggle,
  onNodeClick,
  onFocus,
  renderNode,
  nodeRefs,
}: TreeNodeRowProps<T>) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isFocused = focusedId === node.id;

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(node.id);
    },
    [node.id, onToggle]
  );

  const handleRowClick = useCallback(() => {
    onFocus(node.id);
    onNodeClick?.(node);
  }, [node, onFocus, onNodeClick]);

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        nodeRefs.current.set(node.id, el);
      } else {
        nodeRefs.current.delete(node.id);
      }
    },
    [node.id, nodeRefs]
  );

  return (
    <>
      <div
        ref={setRef}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={level + 1}
        aria-selected={isFocused}
        tabIndex={isFocused ? 0 : -1}
        data-node-id={node.id}
        className={cn(
          'group flex h-8 cursor-pointer items-center text-sm transition-colors',
          'hover:bg-accent/50',
          isFocused && 'border-l-2 border-primary bg-accent/30'
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
        onClick={handleRowClick}
      >
        {/* Indent guides */}
        {Array.from({ length: level }, (_, i) => (
          <span
            key={i}
            className="pointer-events-none absolute border-l border-dotted border-muted-foreground/25"
            style={{
              left: `${i * 24 + 16}px`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}

        {/* Chevron toggle */}
        <span className="mr-1 flex h-4 w-4 shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              type="button"
              tabIndex={-1}
              className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={handleChevronClick}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </span>

        {/* Custom node content */}
        <span className="min-w-0 flex-1">{renderNode(node, level, isExpanded)}</span>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div role="group">
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              focusedId={focusedId}
              onToggle={onToggle}
              onNodeClick={onNodeClick}
              onFocus={onFocus}
              renderNode={renderNode}
              nodeRefs={nodeRefs}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function TreeView<T>({
  nodes,
  renderNode,
  onNodeClick,
  defaultExpandedIds,
  expandAll = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  className,
  emptyMessage = 'No results found',
}: TreeViewProps<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (expandAll) return new Set(collectAllIds(nodes));
    if (defaultExpandedIds) return new Set(defaultExpandedIds);
    return new Set<string>();
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const treeRef = useRef<HTMLDivElement>(null);

  const { displayNodes, searchExpanded } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { displayNodes: nodes, searchExpanded: null };
    }
    const { filtered, expandedIds } = filterTree(nodes, searchQuery.trim());
    return { displayNodes: filtered, searchExpanded: expandedIds };
  }, [nodes, searchQuery]);

  const effectiveExpanded = useMemo(() => {
    if (searchExpanded) {
      return new Set([...expanded, ...searchExpanded]);
    }
    return expanded;
  }, [expanded, searchExpanded]);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleFocus = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const visibleNodes = flattenVisible(displayNodes, effectiveExpanded);
      if (visibleNodes.length === 0) return;

      const currentIndex = focusedId ? visibleNodes.findIndex((n) => n.id === focusedId) : -1;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = currentIndex < visibleNodes.length - 1 ? currentIndex + 1 : 0;
          const nextNode = visibleNodes[nextIndex];
          setFocusedId(nextNode.id);
          nodeRefs.current.get(nextNode.id)?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleNodes.length - 1;
          const prevNode = visibleNodes[prevIndex];
          setFocusedId(prevNode.id);
          nodeRefs.current.get(prevNode.id)?.focus();
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (!focusedId) break;
          const currentNode = visibleNodes[currentIndex];
          if (currentNode?.children && currentNode.children.length > 0) {
            if (!effectiveExpanded.has(currentNode.id)) {
              handleToggle(currentNode.id);
            } else {
              // Move to first child
              const firstChild = currentNode.children[0];
              setFocusedId(firstChild.id);
              // Need to wait for render then focus
              requestAnimationFrame(() => {
                nodeRefs.current.get(firstChild.id)?.focus();
              });
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (!focusedId) break;
          const current = visibleNodes[currentIndex];
          if (current?.children && current.children.length > 0 && effectiveExpanded.has(current.id)) {
            // Collapse current node
            handleToggle(current.id);
          } else {
            // Move to parent
            const parent = findParent(displayNodes, focusedId);
            if (parent) {
              setFocusedId(parent.id);
              nodeRefs.current.get(parent.id)?.focus();
            }
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (!focusedId) break;
          const node = visibleNodes[currentIndex];
          if (node) {
            onNodeClick?.(node);
          }
          break;
        }
      }
    },
    [displayNodes, effectiveExpanded, focusedId, handleToggle, onNodeClick]
  );

  return (
    <div className={cn('flex flex-col', className)}>
      {searchable && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="h-9 pl-8 text-sm"
          />
        </div>
      )}

      <div
        ref={treeRef}
        role="tree"
        className="relative"
        onKeyDown={handleKeyDown}
      >
        {displayNodes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          displayNodes.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              level={0}
              expanded={effectiveExpanded}
              focusedId={focusedId}
              onToggle={handleToggle}
              onNodeClick={onNodeClick}
              onFocus={handleFocus}
              renderNode={renderNode}
              nodeRefs={nodeRefs}
            />
          ))
        )}
      </div>
    </div>
  );
}
