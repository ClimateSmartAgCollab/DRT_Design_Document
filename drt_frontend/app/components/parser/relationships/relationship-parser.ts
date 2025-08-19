// drt_frontend/app/components/parser/relationships/relationship-parser.ts
import { Bundle, Dependency, AdcForm } from "../../type";
import { RelationshipMap, RelationshipNode } from "../types/parser-types";
import { EntityLocator, DefaultEntityLocator } from "../utils/entity-lookup";

export class RelationshipGraphBuilder {
  constructor(
    private readonly bundle: Bundle,
    private readonly dependencies: Dependency[],
    private readonly locator: EntityLocator = DefaultEntityLocator,
    private readonly debug: boolean = false
  ) {}

  buildFromRoot(rootCaptureBase: string): RelationshipMap {
    const relationships: RelationshipMap = {};
    const visited = new Set<string>();

    const traverse = (capBase: string, parent: string | null): void => {
      if (visited.has(capBase)) return;
      visited.add(capBase);

      const entity = this.locator.findByCaptureBase(
        capBase,
        this.bundle,
        this.dependencies
      );
      if (!entity) {
        if (this.debug)
          console.warn(`Entity not found for capture_base: ${capBase}`);
        return;
      }

      const childRefs: string[] = [];
      const refsMap: Record<string, string> = {};

      // Extract "refs:<dep.d>" references from attributes
      Object.entries(entity.capture_base.attributes ?? {}).forEach(
        ([attrKey, attrVal]) => {
          if (typeof attrVal === "string" && attrVal.startsWith("refs:")) {
            const refId = attrVal.replace("refs:", "");
            const refEntity = this.dependencies.find((dep) => dep.d === refId);
            if (refEntity) {
              const childCap = refEntity.capture_base.d;
              childRefs.push(childCap);
              refsMap[attrKey] = childCap;
            }
          }
        }
      );

      const node: RelationshipNode = {
        id: capBase,
        isParent: childRefs.length > 0,
        parent,
        children: childRefs,
        fields: Object.keys(entity.capture_base.attributes ?? {}),
        refsMap,
      };

      relationships[capBase] = node;
      childRefs.forEach((child) => traverse(child, capBase));
    };

    traverse(rootCaptureBase, null);
    return relationships;
  }
}

export class RelationshipGraph {
  constructor(private readonly map: RelationshipMap) {}

  toMap(): RelationshipMap {
    return this.map;
  }

  getParentEntities(): string[] {
    return Object.values(this.map)
      .filter((rel) => rel.isParent)
      .map((rel) => rel.id);
  }

  getChildEntities(parentId: string): string[] {
    return this.map[parentId]?.children ?? [];
  }

  getEntityRefsMap(entityId: string): Record<string, string> {
    return this.map[entityId]?.refsMap ?? {};
  }

  /** Returns true if the graph has no cycles among roots; false otherwise. */
  validateAcyclic(): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (stack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      stack.add(nodeId);

      for (const child of this.map[nodeId]?.children ?? []) {
        if (hasCycle(child)) return true;
      }

      stack.delete(nodeId);
      return false;
    };

    for (const nodeId of Object.keys(this.map)) {
      const node = this.map[nodeId];
      if (node.parent === null && hasCycle(nodeId)) return false;
    }
    return true;
  }
}
