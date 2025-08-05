import { Bundle, Dependency, AdcForm } from '../../type';
import { RelationshipMap, RelationshipNode } from '../types/parser-types';
import { findBundleByCaptureBase } from '../utils/entity-lookup';


export const parseRelationships = (
  bundle: Bundle,
  dependencies: Dependency[],
  presentation: AdcForm,
): RelationshipMap => {
  const relationships: RelationshipMap = {};
  const visited = new Set<string>();


  const traverse = (capBase: string, parent: string | null): void => {
    if (visited.has(capBase)) {
      return;
    }
    
    visited.add(capBase);
    
    const entity = findBundleByCaptureBase(capBase, bundle, dependencies);
    if (!entity) {
      console.warn(`Entity not found for capture_base: ${capBase}`);
      return;
    }

    const childRefs: string[] = [];
    const refsMap: Record<string, string> = {};

    // Extract reference relationships from attributes
    Object.entries(entity.capture_base.attributes ?? {}).forEach(([attrKey, attrVal]) => {
      if (typeof attrVal === 'string' && attrVal.startsWith('refs:')) {
        const refId = attrVal.replace('refs:', '');
        const refEntity = dependencies.find((dep) => dep.d === refId);
        
        if (refEntity) {
          childRefs.push(refEntity.capture_base.d);
          refsMap[attrKey] = refEntity.capture_base.d;
        }
      }
    });

    // Build relationship node
    const relationshipNode: RelationshipNode = {
      id: capBase,
      isParent: childRefs.length > 0,
      parent,
      children: childRefs,
      fields: Object.keys(entity.capture_base.attributes ?? {}),
      refsMap,
    };

    relationships[capBase] = relationshipNode;

    // Recursively process children
    childRefs.forEach((child) => traverse(child, capBase));
  };

  // Start traversal from the presentation's capture base
  traverse(presentation.capture_base, null);
  
  return relationships;
};


export const getParentEntities = (relationships: RelationshipMap): string[] => {
  return Object.values(relationships)
    .filter((rel) => rel.isParent)
    .map((rel) => rel.id);
};


export const getChildEntities = (
  relationships: RelationshipMap,
  parentId: string,
): string[] => {
  const parent = relationships[parentId];
  return parent ? parent.children : [];
};


export const getEntityRefsMap = (
  relationships: RelationshipMap,
  entityId: string,
): Record<string, string> => {
  const entity = relationships[entityId];
  return entity ? entity.refsMap : {};
};


export const validateRelationships = (relationships: RelationshipMap): boolean => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) {
      return true; 
    }
    
    if (visited.has(nodeId)) {
      return false; 
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = relationships[nodeId];
    if (node) {
      for (const childId of node.children) {
        if (hasCycle(childId)) {
          return true;
        }
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  // Check each root node for cycles
  for (const nodeId of Object.keys(relationships)) {
    const node = relationships[nodeId];
    if (node.parent === null && hasCycle(nodeId)) {
      return false;
    }
  }

  return true;
}; 