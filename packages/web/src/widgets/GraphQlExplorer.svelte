<script lang="ts">
  import { tick } from 'svelte';
  import GraphQlExplorerNode from './GraphQlExplorerNode.svelte';
  import { apiCall } from '../utility/api';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import {
    buildGraphQlQueryText,
    parseGraphQlSelectionPaths,
    type GraphQLExplorerFieldNode,
    type GraphQLField,
    type GraphQLType,
    type GraphQLTypeRef,
  } from 'dbgate-rest';

  export let conid;
  export let operationName: string | null = null;
  export let operationKind: 'query' | 'mutation' = 'query';
  export let editorValue: string = '';
  export let setEditorData: (value: string) => void;
  export let onSourceOfTruthChange: (source: 'editor' | 'explorer') => void;
  export let currentSourceOfTruth: 'editor' | 'explorer';
  export let onCurrentNodeChange: (
    node: {
      path: string;
      name: string;
      typeDisplay: string;
      description?: string;
      isArgument?: boolean;
      documentationKind?: 'node' | 'type';
    } | null
  ) => void;

  let rootFields: GraphQLExplorerFieldNode[] = [];
  let queryTypeName: string | null = null;
  let mutationTypeName: string | null = null;
  let loadingRoot = false;
  let loadError: string | null = null;
  let selectedPaths: string[] = [];
  let expandedPaths: Record<string, boolean> = {};
  let loadingPaths: Record<string, boolean> = {};
  let typeCache: Record<string, GraphQLType | null> = {};
  let hasInitialized = false;
  let loadKey = '';
  let lastEmittedQuery = '';
  let lastSyncedEditorValue = '';
  let suppressEditorSync = false;
  let editorSyncHandle: ReturnType<typeof setTimeout> | null = null;
  let pendingEditorPaths: { fieldPaths: string[]; argumentPaths: string[] } | null = null;
  let editorHasFocus = false;
  let scrollToSelectedAfterLoad = false;

  const TYPE_REF_DEPTH = 6;

  $: connection = useConnectionInfo({ conid });

  $: if (conid && $connection?.apiServerUrl1) {
    const nextKey = `${conid}:${$connection.apiServerUrl1}:${operationKind}`;
    if (nextKey !== loadKey) {
      loadKey = nextKey;
      resetState();
      loadRootFields();
    }
  }

  $: if (!hasInitialized && rootFields.length > 0 && !editorValue?.trim()) {
    const initialOpName = operationName?.trim();
    if (initialOpName) {
      const rootField = rootFields.find(field => field.name === initialOpName);
      if (rootField) {
        const firstLeafPath = findFirstLeafPath(rootField, rootField.name);
        if (firstLeafPath) {
          selectedPaths = [firstLeafPath];
          updateQueryText();
        }
      }
    }
    hasInitialized = true;
  }

  $: {
    if (scrollToSelectedAfterLoad && !loadingRoot) {
      scrollToFirstSelectedNode(selectedPaths);
      scrollToSelectedAfterLoad = false;
    }
  }

  function scheduleEditorSync(text: string) {
    if (suppressEditorSync && text === lastEmittedQuery) {
      suppressEditorSync = false;
      lastSyncedEditorValue = text;
      return;
    }

    suppressEditorSync = false;
    lastSyncedEditorValue = text;
    if (editorSyncHandle) clearTimeout(editorSyncHandle);
    editorSyncHandle = setTimeout(() => {
      void syncFromEditor(text);
    }, 150);
  }

  export function handleEditorInput(text: string) {
    if (currentSourceOfTruth !== 'editor') return;
    editorHasFocus = true;
    scheduleEditorSync(text || '');
  }

  export function handleEditorFocus() {
    editorHasFocus = true;
  }

  export function handleEditorBlur() {
    editorHasFocus = false;
  }

  function resetState() {
    rootFields = [];
    queryTypeName = null;
    mutationTypeName = null;
    loadingRoot = false;
    loadError = null;
    selectedPaths = [];
    expandedPaths = {};
    loadingPaths = {};
    typeCache = {};
    hasInitialized = false;
  }

  async function runApiQuery(query: string) {
    if (!$connection?.apiServerUrl1) return null;
    const result = await apiCall('rest-connections/api-query', {
      conid,
      server: $connection.apiServerUrl1,
      query,
    });
    return result?.data?.data ?? result?.data ?? null;
  }

  function buildTypeRefSelection(depth: number): string {
    if (depth <= 0) {
      return `
            kind
            name
          `;
    }

    return `
            kind
            name
            ofType {
${buildTypeRefSelection(depth - 1)}
            }
          `;
  }

  function buildTypeQuery(name: string): string {
    const typeRefSelection = buildTypeRefSelection(TYPE_REF_DEPTH);
    return `
    query TypeQuery {
      __type(name: ${JSON.stringify(name)}) {
        kind
        name
        description
        possibleTypes {
          kind
          name
        }
        fields {
          name
          description
          type {
${typeRefSelection}
          }
          args {
            name
            description
            type {
${typeRefSelection}
            }
            defaultValue
          }
        }
      }
    }
    `;
  }

  function buildSchemaQuery(): string {
    return `
    query SchemaQuery {
      __schema {
        queryType { name }
        mutationType { name }
      }
    }
    `;
  }

  async function loadRootFields() {
    loadingRoot = true;
    loadError = null;
    try {
      const schemaData = await runApiQuery(buildSchemaQuery());
      queryTypeName = schemaData?.__schema?.queryType?.name || null;
      mutationTypeName = schemaData?.__schema?.mutationType?.name || null;
      const rootName = operationKind === 'mutation' ? mutationTypeName : queryTypeName;
      if (!rootName) {
        rootFields = [];
        return;
      }

      const rootType = await fetchType(rootName);
      rootFields = rootType ? buildNodesFromType(rootType) : [];

      if (pendingEditorPaths && rootFields.length > 0) {
        const allPaths = [...pendingEditorPaths.fieldPaths, ...pendingEditorPaths.argumentPaths];
        const fieldPaths = pendingEditorPaths.fieldPaths;
        pendingEditorPaths = null;
        await applySelectionFromPaths(allPaths, fieldPaths);
        if (currentSourceOfTruth === 'editor') {
          await scrollToFirstSelectedNode(fieldPaths);
        }
      }
    } catch (err: any) {
      loadError = err?.message || 'Failed to load GraphQL schema';
    } finally {
      loadingRoot = false;
    }
  }

  async function fetchType(typeName: string): Promise<GraphQLType | null> {
    if (typeCache[typeName]) return typeCache[typeName];
    if (typeCache[typeName] === null) return null;

    const data = await runApiQuery(buildTypeQuery(typeName));
    const type = data?.__type as GraphQLType | null;
    typeCache = {
      ...typeCache,
      [typeName]: type || null,
    };
    return type || null;
  }

  function getTypeDisplay(typeRef: GraphQLTypeRef | null | undefined): string {
    if (!typeRef) return 'Unknown';
    if (typeRef.kind === 'NON_NULL') return `${getTypeDisplay(typeRef.ofType)}!`;
    if (typeRef.kind === 'LIST') return `[${getTypeDisplay(typeRef.ofType)}]`;
    return typeRef.name || 'Unknown';
  }

  function unwrapNamedType(typeRef: GraphQLTypeRef | null | undefined): GraphQLTypeRef | null {
    if (!typeRef) return null;
    if (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') return unwrapNamedType(typeRef.ofType);
    return typeRef;
  }

  function isCompositeKind(kind?: string | null): boolean {
    return kind === 'OBJECT' || kind === 'INTERFACE' || kind === 'UNION';
  }

  function buildNodesFromType(type: GraphQLType): GraphQLExplorerFieldNode[] {
    if (type?.kind === 'UNION') {
      return (type.possibleTypes || [])
        .filter(item => item?.name)
        .map(item => ({
          name: item.name as string,
          description: undefined,
          typeName: item.name as string,
          typeDisplay: item.name as string,
          isLeaf: !isCompositeKind(item.kind),
          children: undefined,
        }));
    }

    if (!type?.fields) return [];
    return type.fields.map((field: GraphQLField) => {
      const namedType = unwrapNamedType(field.type);
      const isLeaf = !isCompositeKind(namedType?.kind);

      // Build argument nodes
      const argumentNodes: GraphQLExplorerFieldNode[] = (field.args || []).map(arg => {
        const argNamedType = unwrapNamedType(arg.type);
        return {
          name: arg.name,
          description: arg.description,
          typeName: argNamedType?.name || 'Unknown',
          typeDisplay: getTypeDisplay(arg.type),
          isLeaf: true,
          isArgument: true,
        };
      });

      return {
        name: field.name,
        description: field.description,
        typeName: namedType?.name || 'Unknown',
        typeDisplay: getTypeDisplay(field.type),
        isLeaf,
        isArgument: false,
        arguments: argumentNodes.length > 0 ? argumentNodes : undefined,
        children: undefined,
      };
    });
  }

  function toggleExpanded(path: string) {
    const next = !expandedPaths[path];
    expandedPaths = {
      ...expandedPaths,
      [path]: next,
    };

    if (next) {
      const node = findNodeByPath(rootFields, path.split('.'));
      if (node && !node.isLeaf && node.children == null && !loadingPaths[path]) {
        loadNodeChildren(node, path);
      }
    }
  }

  async function loadNodeChildren(node: GraphQLExplorerFieldNode, path: string) {
    loadingPaths = { ...loadingPaths, [path]: true };
    try {
      const type = await fetchType(node.typeName);
      const children = type ? buildNodesFromType(type) : [];
      rootFields = updateNodeChildren(rootFields, path.split('.'), children);
    } finally {
      loadingPaths = { ...loadingPaths, [path]: false };
    }
  }

  function getParentPaths(path: string): string[] {
    const parts = path.split('.');
    const parents: string[] = [];
    for (let i = 1; i < parts.length; i++) {
      parents.push(parts.slice(0, i).join('.'));
    }
    return parents;
  }

  async function toggleSelection(node: GraphQLExplorerFieldNode, path: string, nextChecked: boolean) {
    onSourceOfTruthChange('explorer');
    setCurrentNode(path, node);
    if (nextChecked) {
      // When checking a node, add the node and all its parents
      const parentPaths = getParentPaths(path);
      const pathsToAdd = [path, ...parentPaths];
      const combined = new Set([...selectedPaths, ...pathsToAdd]);
      selectedPaths = Array.from(combined);
    } else {
      // When unchecking a node, remove ONLY that exact node
      // Keep all children - they just won't show in query if parent is unchecked
      selectedPaths = selectedPaths.filter(item => item !== path);
    }

    updateQueryText();
  }

  function collectLeafPaths(node: GraphQLExplorerFieldNode, basePath: string): string[] {
    // If node is a leaf or has no children (but may have arguments), return basePath
    if (node.isLeaf) return [basePath];
    if (!node.children?.length) return [basePath];

    const paths: string[] = [];
    for (const child of node.children) {
      paths.push(...collectLeafPaths(child, `${basePath}.${child.name}`));
    }
    return paths;
  }

  function findFirstLeafPath(node: GraphQLExplorerFieldNode, basePath: string): string | null {
    if (node.isLeaf) return basePath;
    if (!node.children?.length) return basePath;
    for (const child of node.children) {
      const next = findFirstLeafPath(child, `${basePath}.${child.name}`);
      if (next) return next;
    }
    return null;
  }

  function findNodeByPath(nodes: GraphQLExplorerFieldNode[], parts: string[]): GraphQLExplorerFieldNode | null {
    if (parts.length === 0) return null;
    const [head, ...rest] = parts;
    const node = nodes.find(item => item.name === head);
    if (!node) return null;
    if (rest.length === 0) return node;
    return findNodeByPath(node.children || [], rest);
  }

  function collectFieldAndArgumentPaths(
    paths: string[],
    nodeTreeMap: Record<string, GraphQLExplorerFieldNode>
  ): {
    fieldPaths: string[];
    fieldArguments: Record<string, string[]>;
    fieldArgumentTypes: Record<string, Record<string, string>>;
  } {
    const fieldPaths: string[] = [];
    const fieldArguments: Record<string, string[]> = {};
    const fieldArgumentTypes: Record<string, Record<string, string>> = {};

    for (const path of paths) {
      const parts = path.split('.');
      let currentNode: GraphQLExplorerFieldNode | null = null;
      let foundField = false;

      // Traverse the node tree to find the node at this path
      let nodes = rootFields;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentNode = nodes.find(n => n.name === part) || null;
        if (!currentNode) break;

        if (i < parts.length - 1) {
          // Check if next part is an argument
          const nextPart = parts[i + 1];
          const isNextArgument = currentNode.arguments?.some(c => c.isArgument && c.name === nextPart);

          if (isNextArgument) {
            // Found an argument path
            const fieldPath = parts.slice(0, i + 1).join('.');
            const argumentName = nextPart;
            const argumentNode = currentNode.arguments?.find(c => c.isArgument && c.name === nextPart);
            if (!fieldArguments[fieldPath]) {
              fieldArguments[fieldPath] = [];
            }
            fieldArguments[fieldPath].push(argumentName);
            if (!fieldArgumentTypes[fieldPath]) {
              fieldArgumentTypes[fieldPath] = {};
            }
            fieldArgumentTypes[fieldPath][argumentName] = argumentNode?.typeDisplay || 'String';
            // Skip the argument node in traversal
            i += 1;
            continue;
          }

          // Continue traversing for field paths
          nodes = currentNode.children || [];
          foundField = true;
        } else {
          // Last part
          if (!currentNode.isArgument) {
            fieldPaths.push(path);
          }
        }
      }
    }

    return { fieldPaths, fieldArguments, fieldArgumentTypes };
  }

  function filterPathsByAncestors(paths: string[]): string[] {
    const pathSet = new Set(paths);
    return paths.filter(path => {
      const ancestors = getParentPaths(path);
      return ancestors.every(ancestor => pathSet.has(ancestor));
    });
  }

  function updateQueryText() {
    if (!setEditorData) return;
    const filteredPaths = filterPathsByAncestors(selectedPaths);
    const { fieldPaths, fieldArguments, fieldArgumentTypes } = collectFieldAndArgumentPaths(filteredPaths, {});
    const queryText = buildGraphQlQueryTextWithVariables(operationKind, fieldPaths, fieldArguments, fieldArgumentTypes);
    lastEmittedQuery = queryText;
    suppressEditorSync = true;
    lastSyncedEditorValue = queryText;
    setEditorData(queryText);
  }

  function setCurrentNode(path: string, node: GraphQLExplorerFieldNode | null) {
    if (!onCurrentNodeChange) return;
    if (!node) {
      onCurrentNodeChange(null);
      return;
    }

    onCurrentNodeChange({
      path,
      name: node.name,
      typeDisplay: node.typeDisplay,
      description: node.description,
      isArgument: !!node.isArgument,
      documentationKind: 'node',
    });
  }

  function handleNodeActive(node: GraphQLExplorerFieldNode, path: string) {
    setCurrentNode(path, node);
  }

  async function handleTypeActive(node: GraphQLExplorerFieldNode, path: string) {
    if (!onCurrentNodeChange) return;

    const typeName = node.typeName;
    if (!typeName || typeName === 'Unknown') {
      onCurrentNodeChange({
        path,
        name: node.typeDisplay,
        typeDisplay: node.typeDisplay,
        description: '',
        isArgument: !!node.isArgument,
        documentationKind: 'type',
      });
      return;
    }

    const type = await fetchType(typeName);
    onCurrentNodeChange({
      path,
      name: type?.name || typeName,
      typeDisplay: type?.kind ? `${typeName} (${type.kind})` : node.typeDisplay,
      description: (type as any)?.description || '',
      isArgument: !!node.isArgument,
      documentationKind: 'type',
    });
  }

  function buildGraphQlQueryTextWithVariables(
    operationType: 'query' | 'mutation',
    selectionPaths: string[],
    fieldArguments: Record<string, string[]> = {},
    fieldArgumentTypes: Record<string, Record<string, string>> = {}
  ): string {
    const indent = '  ';

    // Build the selection tree
    const tree = new Map<string, Map<string, any>>();
    for (const path of selectionPaths) {
      if (!path) continue;
      const parts = path.split('.').filter(Boolean);
      let node = tree;
      for (const part of parts) {
        if (!node.has(part)) {
          node.set(part, new Map());
        }
        node = node.get(part) as Map<string, any>;
      }
    }

    // Build variable declarations
    const variables: Map<string, { path: string; argument: string; type: string }> = new Map();
    let variableCounter = 0;

    for (const [fieldPath, argumentNames] of Object.entries(fieldArguments)) {
      for (const argumentName of argumentNames) {
        const varName = `var${variableCounter++}`;
        const argumentType = fieldArgumentTypes[fieldPath]?.[argumentName] || 'String';
        variables.set(varName, { path: fieldPath, argument: argumentName, type: argumentType });
      }
    }

    // Render the selection tree with arguments
    const renderTree = (node: Map<string, any>, level: number, path: string[] = []): string[] => {
      const lines: string[] = [];
      for (const [name, children] of node.entries()) {
        const newPath = [...path, name];
        const currentFieldPath = newPath.join('.');
        const args = fieldArguments[currentFieldPath];

        let fieldDef = name;
        if (args && args.length > 0) {
          const argStrs = args.map(arg => {
            // Find variable name for this argument
            let varName = '';
            for (const [vName, vInfo] of variables.entries()) {
              if (vInfo.path === currentFieldPath && vInfo.argument === arg) {
                varName = `$${vName}`;
                break;
              }
            }
            return `${arg}: ${varName || 'null'}`;
          });
          fieldDef = `${name}(${argStrs.join(', ')})`;
        }

        if (children.size === 0) {
          lines.push(`${indent.repeat(level)}${fieldDef}`);
        } else {
          lines.push(`${indent.repeat(level)}${fieldDef} {`);
          lines.push(...renderTree(children, level + 1, newPath));
          lines.push(`${indent.repeat(level)}}`);
        }
      }
      return lines;
    };

    const lines: string[] = [];

    // Add variable definitions if there are any
    if (variables.size > 0) {
      const varDefs = Array.from(variables.entries())
        .map(([varName, info]) => `$${varName}: ${info.type}`)
        .join(', ');
      lines.push(`${operationType}(${varDefs}) {`);
    } else {
      lines.push(`${operationType} {`);
    }

    if (tree.size > 0) {
      lines.push(...renderTree(tree, 1));
    }
    lines.push('}');

    return lines.join('\n');
  }

  function updateNodeChildren(
    nodes: GraphQLExplorerFieldNode[],
    parts: string[],
    children: GraphQLExplorerFieldNode[]
  ): GraphQLExplorerFieldNode[] {
    if (parts.length === 0) return nodes;
    const [head, ...rest] = parts;
    return nodes.map(node => {
      if (node.name !== head) return node;
      if (rest.length === 0) {
        return {
          ...node,
          children,
          isLeaf: children.length === 0,
        };
      }

      return {
        ...node,
        children: updateNodeChildren(node.children || [], rest, children),
      };
    });
  }

  export function scrollToFirstSelected() {
    if (loadingRoot) {
      scrollToSelectedAfterLoad = true;
    } else {
      scrollToFirstSelectedNode(selectedPaths);
    }
  }

  async function scrollToFirstSelectedNode(paths: string[]) {
    // Wait for DOM to update
    await tick();

    if (paths.length === 0) return;

    // Find the first leaf path (not just a parent path)
    const leafPath = paths.find(path => {
      const node = findNodeByPath(rootFields, path.split('.'));
      return node && !node.isArgument; // Scroll to actual fields, not arguments
    });

    if (!leafPath) return;

    // Query the DOM for the element with this path
    const element = document.querySelector(`[data-path="${CSS.escape(leafPath)}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async function syncFromEditor(text: string) {
    if (currentSourceOfTruth !== 'editor') return;
    const { fieldPaths, argumentPaths } = parseGraphQlSelectionPaths(text);
    const allPaths = [...fieldPaths, ...argumentPaths];
    if (rootFields.length === 0) {
      pendingEditorPaths = { fieldPaths, argumentPaths };
      return;
    }

    await applySelectionFromPaths(allPaths, fieldPaths);
    if (currentSourceOfTruth === 'editor') {
      await scrollToFirstSelectedNode(fieldPaths);
    }

    const firstPath = fieldPaths[0] || allPaths[0];
    if (firstPath) {
      const firstNode = findNodeByPath(rootFields, firstPath.split('.'));
      setCurrentNode(firstPath, firstNode);
    } else {
      setCurrentNode('', null);
    }
  }

  async function applySelectionFromPaths(paths: string[], fieldPathsOnly: string[] = paths) {
    if (paths.length === 0) {
      selectedPaths = [];
      return;
    }

    // Include parent paths in selection so they appear checked
    const allPathsWithParents = new Set<string>();
    for (const path of paths) {
      allPathsWithParents.add(path);
      const parentPaths = getParentPaths(path);
      for (const parentPath of parentPaths) {
        allPathsWithParents.add(parentPath);
      }
    }
    selectedPaths = Array.from(allPathsWithParents);

    // Only expand ancestors of field selections, not argument selections
    // Arguments are always visible, so they don't need their parent to be expanded
    const nextExpanded: Record<string, boolean> = { ...expandedPaths };
    for (const fieldPath of fieldPathsOnly) {
      const parts = fieldPath.split('.');
      // Expand all ancestors up to but not including the path itself
      for (let i = 0; i < parts.length - 1; i += 1) {
        const prefix = parts.slice(0, i + 1).join('.');
        nextExpanded[prefix] = true;
      }
    }

    expandedPaths = nextExpanded;

    for (const path of paths) {
      await ensurePathLoaded(path);
    }
  }

  async function ensurePathLoaded(path: string) {
    const parts = path.split('.');
    for (let depth = 1; depth < parts.length; depth += 1) {
      const prefix = parts.slice(0, depth).join('.');
      const node = findNodeByPath(rootFields, prefix.split('.'));
      if (!node || node.isLeaf) continue;
      if (node.children == null && !loadingPaths[prefix]) {
        await loadNodeChildren(node, prefix);
      }
    }
  }

  // $: console.log('expandedPaths', expandedPaths);
</script>

<div class="explorer">
  <div class="explorer-tree">
    {#if loadError}
      <div class="explorer-empty">{loadError}</div>
    {:else if loadingRoot}
      <div class="explorer-empty">Loading schema...</div>
    {:else if rootFields.length > 0}
      {#each rootFields as field}
        <GraphQlExplorerNode
          node={field}
          path={field.name}
          level={0}
          {expandedPaths}
          {toggleExpanded}
          {selectedPaths}
          {toggleSelection}
          onNodeActive={handleNodeActive}
          onTypeActive={handleTypeActive}
        />
      {/each}
    {:else}
      <div class="explorer-empty">No GraphQL operations available</div>
    {/if}
  </div>
</div>

<style>
  .explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  .explorer-tree {
    padding: 8px 8px 12px;
    overflow: auto;
    flex: 1;
    min-width: 0;
    max-height: 100%;
  }

  .explorer-empty {
    color: var(--theme-generic-font-grayed);
    padding: 8px 12px;
  }
</style>
